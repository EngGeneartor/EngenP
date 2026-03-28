"use client"

/**
 * lib/hooks/use-project.ts
 *
 * React hook that manages the full project lifecycle:
 *   - Loading the project list from Supabase
 *   - Saving a passage after structurization
 *   - Saving a question set + individual questions after generation
 *   - Loading a specific project (passage + latest question set + questions)
 *   - Deleting a project
 *   - Renaming a project title
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { StructuredPassage, GeneratedQuestion } from '@/lib/types'
import type { Passage, QuestionSet, Question } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Shape of a project entry shown in the sidebar
// ---------------------------------------------------------------------------

export interface ProjectSummary {
  /** passages.id */
  id: string
  title: string | null
  source: string | null
  questionsCount: number
  /** Question type labels collected from the latest question_set */
  types: string[]
  createdAt: Date
  /** Latest question_set id, if any */
  questionSetId: string | null
}

// ---------------------------------------------------------------------------
// Shape returned when loading a full project
// ---------------------------------------------------------------------------

export interface LoadedProject {
  passage: Passage
  questionSet: QuestionSet | null
  questions: Question[]
  structuredPassage: StructuredPassage | null
  generatedQuestions: GeneratedQuestion[]
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProject(userId: string | undefined) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // ─── Load project list ────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      // Fetch passages
      const { data: passages, error: passErr } = await supabase
        .from('passages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (passErr) throw passErr
      if (!passages || passages.length === 0) {
        setProjects([])
        return
      }

      // Fetch question_sets for those passages in a single query
      const passageIds = passages.map((p) => p.id)
      const { data: qSets } = await supabase
        .from('question_sets')
        .select('id, passage_id, options, created_at')
        .in('passage_id', passageIds)
        .order('created_at', { ascending: false })

      // Aggregate question counts per passage from a single count query
      const { data: qCounts } = await supabase
        .from('questions')
        .select('question_set_id')
        .in(
          'question_set_id',
          (qSets ?? []).map((qs) => qs.id),
        )

      // Build a map: passage_id → latest question_set
      const latestQSet = new Map<string, (typeof qSets)[number]>()
      for (const qs of qSets ?? []) {
        if (!latestQSet.has(qs.passage_id)) {
          latestQSet.set(qs.passage_id, qs)
        }
      }

      // Build a map: question_set_id → count
      const countByQSet = new Map<string, number>()
      for (const q of qCounts ?? []) {
        countByQSet.set(q.question_set_id, (countByQSet.get(q.question_set_id) ?? 0) + 1)
      }

      const summaries: ProjectSummary[] = passages.map((p) => {
        const qs = latestQSet.get(p.id) ?? null
        const qCount = qs ? (countByQSet.get(qs.id) ?? 0) : 0

        // Extract question type labels from options.types if present
        let types: string[] = []
        if (qs?.options && typeof qs.options === 'object' && !Array.isArray(qs.options)) {
          const opts = qs.options as Record<string, unknown>
          if (Array.isArray(opts.types)) {
            types = (opts.types as string[]).map(typeIdToLabel)
          }
        }

        return {
          id: p.id,
          title: p.title,
          source: p.source,
          questionsCount: qCount,
          types,
          createdAt: new Date(p.created_at),
          questionSetId: qs?.id ?? null,
        }
      })

      setProjects(summaries)
    } catch (err) {
      console.error('[useProject] loadProjects error', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // ─── Save passage ─────────────────────────────────────────────────────────

  /**
   * Upsert a passage row.
   * - If passageId is provided, updates that row.
   * - Otherwise inserts a new row and returns its id.
   */
  const savePassage = useCallback(
    async (
      structured: StructuredPassage,
      fileName?: string,
      fileUrl?: string,
      existingPassageId?: string,
    ): Promise<string | null> => {
      if (!userId) return null
      setIsSaving(true)
      try {
        const payload = {
          user_id: userId,
          title: structured.title ?? fileName ?? null,
          source: fileName ?? null,
          original_file_name: fileName ?? null,
          original_file_url: fileUrl ?? null,
          structured_data: structured as unknown as Record<string, unknown>,
          status: 'completed' as const,
        }

        if (existingPassageId) {
          const { error } = await supabase
            .from('passages')
            .update({ ...payload })
            .eq('id', existingPassageId)
          if (error) throw error
          setSavedAt(new Date())
          return existingPassageId
        } else {
          const { data, error } = await supabase
            .from('passages')
            .insert(payload)
            .select('id')
            .single()
          if (error) throw error
          setSavedAt(new Date())
          await loadProjects()
          return data.id
        }
      } catch (err) {
        console.error('[useProject] savePassage error', err)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [userId, loadProjects],
  )

  // ─── Save question set + questions ───────────────────────────────────────

  /**
   * Insert a question_set row and all associated question rows.
   * Returns the new question_set id, or null on failure.
   */
  const saveQuestionSet = useCallback(
    async (
      passageId: string,
      questions: GeneratedQuestion[],
      options?: { types?: string[]; difficulty?: number; count?: number },
    ): Promise<string | null> => {
      if (!userId) return null
      setIsSaving(true)
      try {
        // Insert question_set
        const { data: qsRow, error: qsErr } = await supabase
          .from('question_sets')
          .insert({
            user_id: userId,
            passage_id: passageId,
            options: options ?? null,
            status: 'completed' as const,
          })
          .select('id')
          .single()

        if (qsErr) throw qsErr

        // Insert individual questions
        if (questions.length > 0) {
          const rows = questions.map((q, idx) => ({
            question_set_id: qsRow.id,
            type: q.type_id,
            question_number: q.question_number ?? idx + 1,
            difficulty: q.difficulty ?? null,
            instruction: q.instruction,
            passage_with_markers: q.passage_with_markers ?? null,
            choices: q.choices as unknown as Record<string, unknown> | null,
            answer: q.answer,
            explanation: q.explanation ?? null,
            test_point: q.test_point ?? null,
          }))

          const { error: qErr } = await supabase.from('questions').insert(rows)
          if (qErr) throw qErr
        }

        setSavedAt(new Date())
        await loadProjects()
        return qsRow.id
      } catch (err) {
        console.error('[useProject] saveQuestionSet error', err)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [userId, loadProjects],
  )

  // ─── Load specific project ────────────────────────────────────────────────

  const loadProject = useCallback(
    async (passageId: string): Promise<LoadedProject | null> => {
      if (!userId) return null
      try {
        // Fetch passage
        const { data: passage, error: pErr } = await supabase
          .from('passages')
          .select('*')
          .eq('id', passageId)
          .eq('user_id', userId)
          .single()

        if (pErr || !passage) throw pErr ?? new Error('Passage not found')

        // Fetch latest question_set for this passage
        const { data: qSets } = await supabase
          .from('question_sets')
          .select('*')
          .eq('passage_id', passageId)
          .order('created_at', { ascending: false })
          .limit(1)

        const questionSet = qSets?.[0] ?? null

        // Fetch questions for that question_set
        let questions: Question[] = []
        if (questionSet) {
          const { data: qs } = await supabase
            .from('questions')
            .select('*')
            .eq('question_set_id', questionSet.id)
            .order('question_number', { ascending: true })
          questions = qs ?? []
        }

        // Reconstruct app-level types from DB rows
        const structuredPassage = passage.structured_data
          ? (passage.structured_data as unknown as StructuredPassage)
          : null

        const generatedQuestions: GeneratedQuestion[] = questions.map((q) => ({
          question_number: q.question_number,
          type_id: q.type,
          difficulty: q.difficulty ?? 3,
          instruction: q.instruction,
          passage_with_markers: q.passage_with_markers ?? undefined,
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : null,
          answer: q.answer,
          explanation: q.explanation ?? '',
          test_point: q.test_point ?? '',
        }))

        return { passage, questionSet, questions, structuredPassage, generatedQuestions }
      } catch (err) {
        console.error('[useProject] loadProject error', err)
        return null
      }
    },
    [userId],
  )

  // ─── Delete project ───────────────────────────────────────────────────────

  const deleteProject = useCallback(
    async (passageId: string): Promise<boolean> => {
      if (!userId) return false
      try {
        const { error } = await supabase
          .from('passages')
          .delete()
          .eq('id', passageId)
          .eq('user_id', userId)

        if (error) throw error
        setProjects((prev) => prev.filter((p) => p.id !== passageId))
        return true
      } catch (err) {
        console.error('[useProject] deleteProject error', err)
        return false
      }
    },
    [userId],
  )

  // ─── Rename project ───────────────────────────────────────────────────────

  const renameProject = useCallback(
    async (passageId: string, newTitle: string): Promise<boolean> => {
      if (!userId) return false
      try {
        const { error } = await supabase
          .from('passages')
          .update({ title: newTitle })
          .eq('id', passageId)
          .eq('user_id', userId)

        if (error) throw error
        setProjects((prev) =>
          prev.map((p) => (p.id === passageId ? { ...p, title: newTitle } : p)),
        )
        return true
      } catch (err) {
        console.error('[useProject] renameProject error', err)
        return false
      }
    },
    [userId],
  )

  // ─── Create blank project ─────────────────────────────────────────────────

  const createProject = useCallback(
    async (title?: string): Promise<string | null> => {
      if (!userId) return null
      try {
        const { data, error } = await supabase
          .from('passages')
          .insert({
            user_id: userId,
            title: title ?? '새 프로젝트',
            status: 'pending' as const,
          })
          .select('id')
          .single()

        if (error) throw error
        await loadProjects()
        return data.id
      } catch (err) {
        console.error('[useProject] createProject error', err)
        return null
      }
    },
    [userId, loadProjects],
  )

  return {
    projects,
    isLoading,
    isSaving,
    savedAt,
    loadProjects,
    createProject,
    savePassage,
    saveQuestionSet,
    loadProject,
    deleteProject,
    renameProject,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map internal type IDs to Korean display labels */
function typeIdToLabel(typeId: string): string {
  const map: Record<string, string> = {
    grammar: '어법',
    grammar_choice: '어법',
    vocabulary: '어휘',
    vocabulary_choice: '어휘',
    blank: '빈칸 추론',
    blank_inference: '빈칸 추론',
    order: '순서 배열',
    sentence_ordering: '순서 배열',
    insertion: '문장 삽입',
    sentence_insertion: '문장 삽입',
    title: '제목 추론',
    topic_summary: '제목 추론',
    purpose: '글의 목적',
    summary: '요약문',
    implication: '함축 의미',
    mood: '심경 변화',
  }
  return map[typeId] ?? typeId
}
