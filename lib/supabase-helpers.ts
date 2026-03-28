import { supabase } from '@/lib/supabase'
import type {
  PassageInsert,
  PassageUpdate,
  QuestionSetInsert,
  QuestionInsert,
  Json,
} from '@/lib/types/database'

// ---------------------------------------------------------------------------
// passages
// ---------------------------------------------------------------------------

/**
 * Insert a new passage row for the given user.
 * Returns the created row or throws on error.
 */
export async function savePassage(
  userId: string,
  data: Omit<PassageInsert, 'user_id'>,
) {
  const { data: row, error } = await supabase
    .from('passages')
    .insert({ ...data, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return row
}

/**
 * Fetch all passages belonging to the given user, newest first.
 */
export async function getPassages(userId: string) {
  const { data, error } = await supabase
    .from('passages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Update specific fields of a passage row.
 * Returns the updated row or throws on error.
 */
export async function updatePassage(
  passageId: string,
  updates: PassageUpdate,
) {
  const { data: row, error } = await supabase
    .from('passages')
    .update(updates)
    .eq('id', passageId)
    .select()
    .single()

  if (error) throw error
  return row
}

// ---------------------------------------------------------------------------
// question_sets
// ---------------------------------------------------------------------------

/**
 * Insert a new question set for the given user and passage.
 * Returns the created row or throws on error.
 */
export async function saveQuestionSet(
  userId: string,
  passageId: string,
  options: {
    title?: string
    options?: Json
  } = {},
) {
  const payload: QuestionSetInsert = {
    user_id: userId,
    passage_id: passageId,
    title: options.title ?? null,
    options: options.options ?? null,
  }

  const { data: row, error } = await supabase
    .from('question_sets')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return row
}

/**
 * Fetch all question sets belonging to the given user, newest first.
 */
export async function getQuestionSets(userId: string) {
  const { data, error } = await supabase
    .from('question_sets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------

/**
 * Insert multiple questions for a question set in a single request.
 * Returns the created rows or throws on error.
 */
export async function saveQuestions(
  questionSetId: string,
  questions: Omit<QuestionInsert, 'question_set_id'>[],
) {
  const rows: QuestionInsert[] = questions.map((q) => ({
    ...q,
    question_set_id: questionSetId,
  }))

  const { data, error } = await supabase
    .from('questions')
    .insert(rows)
    .select()

  if (error) throw error
  return data
}

/**
 * Fetch all questions for a question set, ordered by question_number.
 */
export async function getQuestions(questionSetId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('question_set_id', questionSetId)
    .order('question_number', { ascending: true })

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// exports
// ---------------------------------------------------------------------------

/**
 * Record an export event and return the created row.
 */
export async function saveExport(
  userId: string,
  questionSetId: string,
  format: 'docx' | 'hwpx' | 'pdf',
  fileUrl: string | null,
  options?: Json,
) {
  const { data: row, error } = await supabase
    .from('exports')
    .insert({
      user_id: userId,
      question_set_id: questionSetId,
      format,
      file_url: fileUrl ?? null,
      options: options ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return row
}

// ---------------------------------------------------------------------------
// usage_logs
// ---------------------------------------------------------------------------

/**
 * Append a usage log entry.
 * Returns the created row or throws on error.
 */
export async function logUsage(
  userId: string,
  action: string,
  tokens: number = 0,
) {
  const { data: row, error } = await supabase
    .from('usage_logs')
    .insert({ user_id: userId, action, tokens_used: tokens })
    .select()
    .single()

  if (error) throw error
  return row
}
