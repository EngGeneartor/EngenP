"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, BarChart3, Settings2, ChevronDown, Zap, Sparkles, LogOut, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { UsageIndicator } from "@/components/usage-indicator"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { UploadedFile, StructuredPassage, GeneratedQuestion, SchoolDnaProfile } from "@/lib/types"
import { structurizeFile, generateQuestions, analyzeExamDna, mapSidebarTypes } from "@/lib/api-client"
import type { ProcessingStep } from "@/app/dashboard/page"

const questionTypes = [
  { id: "grammar", label: "어법" },
  { id: "vocabulary", label: "어휘" },
  { id: "blank", label: "빈칸 추론" },
  { id: "order", label: "순서 배열" },
  { id: "insertion", label: "문장 삽입" },
  { id: "title", label: "제목 추론" },
  { id: "purpose", label: "글의 목적" },
  { id: "summary", label: "요약문" },
  { id: "implication", label: "함축 의미" },
  { id: "mood", label: "심경 변화" },
]

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "text/plain"]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/** Sample demo data returned when no API key is configured */
const DEMO_PASSAGE: StructuredPassage = {
  id: "demo-passage",
  title: "Cultural Intelligence in a Globalized World",
  paragraphs: [
    {
      index: 0,
      rawText: `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) refers to an individual's capability to function effectively across various cultural contexts.`,
      sentences: [
        { index: 0, text: `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world.` },
        { index: 1, text: `Unlike traditional measures of intelligence, cultural intelligence (CQ) refers to an individual's capability to function effectively across various cultural contexts.` },
      ],
    },
    {
      index: 1,
      rawText: `The development of cultural intelligence involves four key components: cognitive, metacognitive, motivational, and behavioral.`,
      sentences: [
        { index: 2, text: `The development of cultural intelligence involves four key components: cognitive, metacognitive, motivational, and behavioral.` },
      ],
    },
  ],
  keyVocab: [
    { word: "competency", pos: "noun", definition: "the ability to do something successfully", definitionKo: "역량", sentenceIndex: 0 },
    { word: "metacognitive", pos: "adjective", definition: "relating to awareness of one's own thought processes", definitionKo: "메타인지의", sentenceIndex: 2 },
    { word: "behavioral", pos: "adjective", definition: "relating to behavior", definitionKo: "행동적인", sentenceIndex: 2 },
  ],
  fullText: `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) refers to an individual's capability to function effectively across various cultural contexts. The development of cultural intelligence involves four key components: cognitive, metacognitive, motivational, and behavioral.`,
  wordCount: 247,
  estimatedDifficulty: 3,
  topics: ["culture", "education", "psychology"],
  structurizedAt: new Date().toISOString(),
}

const DEMO_QUESTIONS: GeneratedQuestion[] = [
  {
    question_number: 1,
    type_id: "grammar_choice",
    difficulty: 3,
    instruction: "밑줄 친 (A), (B)에서 어법에 맞는 표현으로 가장 적절한 것은?",
    passage_with_markers: `The concept of "cultural intelligence" has (A) [emerged / emerging] as a critical competency. Unlike traditional measures, CQ (B) [refers / referring] to an individual's capability.`,
    choices: ["emerged – refers", "emerged – referring", "emerging – refers", "emerging – referring"],
    answer: "① emerged – refers",
    explanation: "(A)는 현재완료의 동사 자리이므로 과거분사 emerged가 맞습니다. (B)는 주어 CQ에 대한 본동사 자리이므로 refers가 맞습니다.",
    test_point: "현재완료 / 주어-동사 수일치",
  },
  {
    question_number: 2,
    type_id: "blank_inference",
    difficulty: 4,
    instruction: "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
    passage_with_markers: `The development of cultural intelligence involves four key components. This suggests that cultural intelligence is not just about ____________, but also about how we process and apply that knowledge.`,
    choices: ["accumulating information", "avoiding conflicts", "expressing emotions", "maintaining traditions", "building relationships"],
    answer: "① accumulating information",
    explanation: "빈칸 앞에서 인지적·메타인지적 요소를 언급하고 있으므로, 단순히 정보를 축적하는 것 이상이라는 내용이 자연스럽습니다.",
    test_point: "글의 흐름 파악 / 빈칸 추론",
  },
]

interface LeftSidebarProps {
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  selectedFile: UploadedFile | null
  onFileSelect: (file: UploadedFile | null) => void
  // Pipeline state (from Dashboard)
  isDemo?: boolean
  isProcessing?: boolean
  processingStep?: ProcessingStep
  pipelineError?: string | null
  onStructuredPassage?: (passage: StructuredPassage) => void
  onGeneratedQuestions?: (questions: GeneratedQuestion[]) => void
  onIsProcessing?: (v: boolean) => void
  onProcessingStep?: (step: ProcessingStep) => void
  onPipelineError?: (err: string | null) => void
  /** Authenticated user ID — used to render usage stats */
  userId?: string
  /** Current DNA profile (from Dashboard state) */
  dnaProfile?: SchoolDnaProfile | null
  /** Callback to update DNA profile in Dashboard state */
  onDnaProfile?: (profile: SchoolDnaProfile | null) => void
}

export function LeftSidebar({
  uploadedFiles,
  setUploadedFiles,
  selectedFile,
  onFileSelect,
  isDemo = false,
  isProcessing = false,
  processingStep = "idle",
  pipelineError = null,
  onStructuredPassage,
  onGeneratedQuestions,
  onIsProcessing,
  onProcessingStep,
  onPipelineError,
  userId,
  dnaProfile,
  onDnaProfile,
}: LeftSidebarProps) {
  const [difficulty, setDifficulty] = useState([3])
  const [questionCount, setQuestionCount] = useState([5])
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["grammar", "vocabulary", "blank"])
  const [sectionsOpen, setSectionsOpen] = useState({
    upload: true,
    analysis: false,
    options: true,
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DNA analysis state
  const [isDnaAnalyzing, setIsDnaAnalyzing] = useState(false)
  const [dnaError, setDnaError] = useState("")
  const [isDnaDragging, setIsDnaDragging] = useState(false)
  const dnaFileInputRef = useRef<HTMLInputElement>(null)

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  const difficultyLabels = ["", "매우 쉬움", "쉬움", "보통", "어려움", "매우 어려움"]

  // ─── Upload ────────────────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("")

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("지원하지 않는 파일 형식입니다. (PDF, JPG, PNG, TXT)")
      return
    }

    if (file.size > MAX_SIZE) {
      setUploadError("파일 크기가 10MB를 초과합니다.")
      return
    }

    if (uploadedFiles.some(f => f.name === file.name)) {
      setUploadError("이미 업로드된 파일입니다.")
      return
    }

    setIsUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError("로그인이 필요합니다.")
        return
      }

      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from("passages")
        .upload(filePath, file)

      if (error) {
        setUploadError(`업로드 실패: ${error.message}`)
        return
      }

      const { data: urlData } = supabase.storage
        .from("passages")
        .getPublicUrl(filePath)

      const newFile: UploadedFile = {
        name: file.name,
        size: file.size,
        path: filePath,
        type: file.type,
        uploadedAt: new Date(),
        publicUrl: urlData.publicUrl,
      }

      setUploadedFiles(prev => [...prev, newFile])
      onFileSelect(newFile)
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다.")
    } finally {
      setIsUploading(false)
    }
  }, [uploadedFiles])

  const deleteFile = async (file: UploadedFile) => {
    const { error } = await supabase.storage
      .from("passages")
      .remove([file.path])

    if (!error) {
      setUploadedFiles(prev => prev.filter(f => f.path !== file.path))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(uploadFile)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      Array.from(files).forEach(uploadFile)
    }
  }, [uploadFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  // ─── DNA Analysis ─────────────────────────────────────────────────────────

  /**
   * Convert a File to base64 string (no data-URL prefix).
   */
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip the "data:<mime>;base64," prefix
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const DNA_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  const DNA_MAX_SIZE = 10 * 1024 * 1024 // 10MB per image

  const handleDnaFiles = useCallback(async (files: File[]) => {
    setDnaError("")
    if (files.length === 0) return

    // Validate all files
    for (const file of files) {
      if (!DNA_ALLOWED_TYPES.includes(file.type)) {
        setDnaError("이미지 파일만 지원됩니다. (JPG, PNG, WEBP, GIF)")
        return
      }
      if (file.size > DNA_MAX_SIZE) {
        setDnaError(`${file.name}: 파일 크기가 10MB를 초과합니다.`)
        return
      }
    }

    setIsDnaAnalyzing(true)
    onDnaProfile?.(null)

    try {
      // Convert all files to base64
      const examFiles = await Promise.all(
        files.map(async (file) => ({
          base64: await fileToBase64(file),
          mediaType: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        }))
      )

      const profile = await analyzeExamDna(examFiles)
      onDnaProfile?.(profile)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DNA 분석 중 오류가 발생했습니다."
      setDnaError(msg)
    } finally {
      setIsDnaAnalyzing(false)
    }
  }, [onDnaProfile])

  const handleDnaFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      handleDnaFiles(Array.from(files))
    }
    if (dnaFileInputRef.current) dnaFileInputRef.current.value = ""
  }

  const handleDnaDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDnaDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      handleDnaFiles(Array.from(files))
    }
  }, [handleDnaFiles])

  const handleDnaDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDnaDragging(true)
  }

  const handleDnaDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDnaDragging(false)
  }

  // ─── Generate Pipeline ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (isProcessing) return

    // Demo mode: return sample data immediately
    if (isDemo) {
      onIsProcessing?.(true)
      onProcessingStep?.("structurizing")
      onPipelineError?.(null)
      await new Promise(r => setTimeout(r, 800))
      onStructuredPassage?.(DEMO_PASSAGE)
      onProcessingStep?.("generating")
      await new Promise(r => setTimeout(r, 800))
      onGeneratedQuestions?.(DEMO_QUESTIONS)
      onProcessingStep?.("done")
      onIsProcessing?.(false)
      return
    }

    const targetFile = selectedFile ?? uploadedFiles[0]
    if (!targetFile?.publicUrl) {
      onPipelineError?.("처리할 파일이 없습니다.")
      return
    }

    onIsProcessing?.(true)
    onPipelineError?.(null)

    try {
      // Step 1: Structurize
      onProcessingStep?.("structurizing")
      const passage = await structurizeFile(targetFile.publicUrl)
      onStructuredPassage?.(passage)

      // Step 2: Generate questions (pass DNA profile if available)
      onProcessingStep?.("generating")
      const mappedTypes = mapSidebarTypes(selectedTypes)
      const questions = await generateQuestions(
        passage,
        {
          types: mappedTypes.length > 0 ? mappedTypes : undefined,
          difficulty: difficulty[0],
          count: questionCount[0],
        },
        dnaProfile ?? undefined
      )
      onGeneratedQuestions?.(questions)
      onProcessingStep?.("done")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다."
      onPipelineError?.(msg)
      onProcessingStep?.("idle")
    } finally {
      onIsProcessing?.(false)
    }
  }

  // ─── Processing label ──────────────────────────────────────────────────────

  const processingLabel =
    processingStep === "structurizing" ? "지문 분석 중..." :
    processingStep === "generating"    ? "문제 생성 중..." :
    processingStep === "exporting"     ? "내보내는 중..."  :
    processingStep === "done"          ? "완료!"           :
    uploadedFiles.length > 0           ? "문제 생성하기"   : "지문을 먼저 업로드하세요"

  const isGenerating = processingStep === "structurizing" || processingStep === "generating"

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="relative z-10 flex h-full w-[310px] flex-col sidebar-glass">
      {/* Logo - click to go home */}
      <a href="/EngenP/" className="flex items-center gap-3 px-5 py-5 transition-smooth hover:opacity-80">
        <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-md">
          <Zap className="size-[18px] text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-extrabold tracking-tight text-gradient-bright">Abyss</h1>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground/70">AI 내신 변형 문제 생성기</p>
        </div>
      </a>

      <div className="divider-gradient mx-4" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2.5">
          {/* Target Passage Upload */}
          <Collapsible
            open={sectionsOpen.upload}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, upload: open }))}
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-foreground/80 transition-smooth hover:bg-accent/50">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-lg bg-purple-500/15">
                  <Upload className="size-3.5 text-purple-400" />
                </div>
                <span>타겟 지문 업로드</span>
              </div>
              <div className="flex items-center gap-2">
                {uploadedFiles.length > 0 && (
                  <span className="pill border border-purple-500/20 bg-purple-500/10 text-purple-400">{uploadedFiles.length}개</span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground/50 transition-transform duration-300",
                    sectionsOpen.upload && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "cursor-pointer rounded-2xl border border-dashed p-5 text-center transition-smooth",
                  isDragging
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-border/60 bg-muted/20 hover:border-purple-500/40 hover:bg-purple-500/[0.03]",
                  isUploading && "pointer-events-none opacity-60"
                )}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-purple-400" />
                    <p className="text-[12px] font-medium text-purple-700 dark:text-purple-300">업로드 중...</p>
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "mx-auto flex size-11 items-center justify-center rounded-xl bg-gradient-to-br transition-smooth",
                      isDragging
                        ? "from-purple-500/30 to-indigo-500/30"
                        : "from-purple-500/15 to-indigo-500/15"
                    )}>
                      <Upload className={cn("size-5", isDragging ? "text-purple-600 dark:text-purple-300" : "text-purple-500/80 dark:text-purple-400/80")} />
                    </div>
                    <p className="mt-3 text-[13px] font-medium text-foreground/80">
                      {isDragging ? "여기에 놓으세요!" : "파일을 드래그하거나 클릭"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      PDF, JPG, PNG, TXT (최대 10MB)
                    </p>
                  </>
                )}
              </div>

              {/* Error message */}
              {uploadError && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2">
                  <X className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{uploadError}</p>
                </div>
              )}

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => onFileSelect(file)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-smooth",
                        selectedFile?.path === file.path
                          ? "bg-purple-500/15 border-purple-500/25"
                          : "bg-purple-500/[0.06] border-purple-500/[0.08] hover:bg-purple-500/[0.1]"
                      )}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
                        <FileText className="size-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[11px] font-medium text-foreground/70">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground/50">{formatFileSize(file.size)}</p>
                      </div>
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400/60" />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteFile(file); if (selectedFile?.path === file.path) onFileSelect(null); }}
                        className="text-[11px] font-medium text-muted-foreground/40 transition-smooth hover:text-red-400"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Past Exam Style Analysis (DNA) */}
          <Collapsible
            open={sectionsOpen.analysis}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, analysis: open }))}
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-foreground/80 transition-smooth hover:bg-accent/50">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/15">
                  <BarChart3 className="size-3.5 text-indigo-400" />
                </div>
                <span>기출 스타일 분석</span>
              </div>
              <div className="flex items-center gap-2">
                {dnaProfile && (
                  <span className="pill border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">적용됨</span>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground/50 transition-transform duration-300",
                    sectionsOpen.analysis && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {/* Hidden file input for DNA images */}
              <input
                ref={dnaFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                multiple
                onChange={handleDnaFileSelect}
                className="hidden"
              />

              {/* DNA Drop zone */}
              <div
                onClick={() => !isDnaAnalyzing && dnaFileInputRef.current?.click()}
                onDrop={handleDnaDrop}
                onDragOver={handleDnaDragOver}
                onDragLeave={handleDnaDragLeave}
                className={cn(
                  "cursor-pointer rounded-2xl border border-dashed p-4 text-center transition-smooth",
                  isDnaDragging
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-border/60 bg-muted/20 hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]",
                  isDnaAnalyzing && "pointer-events-none opacity-60"
                )}
              >
                {isDnaAnalyzing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-7 animate-spin text-indigo-400" />
                    <p className="text-[12px] font-medium text-indigo-700 dark:text-indigo-300">DNA 분석 중...</p>
                    <p className="text-[11px] text-muted-foreground/60">시험지를 분석하고 있습니다</p>
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "mx-auto flex size-9 items-center justify-center rounded-xl bg-gradient-to-br transition-smooth",
                      isDnaDragging ? "from-indigo-500/30 to-blue-500/30" : "from-indigo-500/15 to-blue-500/15"
                    )}>
                      <BarChart3 className={cn("size-4", isDnaDragging ? "text-indigo-400" : "text-indigo-400/80")} />
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-foreground/80">
                      {isDnaDragging ? "여기에 놓으세요!" : "기출 시험지 이미지 업로드"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      JPG, PNG, WEBP (복수 선택 가능)
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/40">
                      이미지가 많을수록 분석 정확도 향상
                    </p>
                  </>
                )}
              </div>

              {/* DNA Error */}
              {dnaError && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2">
                  <X className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-[11px] text-red-700 dark:text-red-300">{dnaError}</p>
                </div>
              )}

              {/* DNA Profile Summary (when analysis is done) */}
              {dnaProfile && !isDnaAnalyzing && (
                <div className="mt-2.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-indigo-400" />
                      <span className="text-[12px] font-semibold text-indigo-700 dark:text-indigo-300">
                        DNA 분석 완료
                      </span>
                    </div>
                    <button
                      onClick={() => { onDnaProfile?.(null); setDnaError("") }}
                      className="text-[10px] text-muted-foreground/40 hover:text-red-400 transition-smooth"
                    >
                      초기화
                    </button>
                  </div>

                  {/* Confidence badge */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold",
                      dnaProfile.analysis_basis.confidence_level === "HIGH"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : dnaProfile.analysis_basis.confidence_level === "MEDIUM"
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-red-500/15 text-red-400"
                    )}>
                      신뢰도: {dnaProfile.analysis_basis.confidence_level}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {dnaProfile.analysis_basis.total_exams_analyzed}회 시험 · {dnaProfile.analysis_basis.total_questions_analyzed}문항
                    </span>
                  </div>

                  {/* Key stats */}
                  <div className="flex flex-col gap-1.5 text-[11px]">
                    {dnaProfile.school_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground/60">학교</span>
                        <span className="font-medium text-foreground/70 truncate max-w-[140px]">{dnaProfile.school_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/60">평균 난이도</span>
                      <span className="font-medium text-foreground/70">{dnaProfile.average_difficulty.toFixed(1)}/5</span>
                    </div>
                    {dnaProfile.preferred_question_types.length > 0 && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground/60 shrink-0">선호 유형</span>
                        <span className="font-medium text-foreground/70 text-right">
                          {dnaProfile.preferred_question_types.slice(0, 3).join(', ')}
                        </span>
                      </div>
                    )}
                    {dnaProfile.grammar_focus.top_grammar_points.length > 0 && (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground/60 shrink-0">문법 집중</span>
                        <span className="font-medium text-foreground/70 text-right">
                          {dnaProfile.grammar_focus.top_grammar_points
                            .slice(0, 2)
                            .map((g) => g.grammar_point_ko)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-2.5 text-[10px] text-indigo-600/70 dark:text-indigo-400/60">
                    다음 문제 생성 시 이 스타일이 자동 적용됩니다
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Generation Options */}
          <Collapsible
            open={sectionsOpen.options}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, options: open }))}
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-foreground/80 transition-smooth hover:bg-accent/50">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-lg bg-violet-500/15">
                  <Settings2 className="size-3.5 text-violet-400" />
                </div>
                <span>출제 옵션</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground/50 transition-transform duration-300",
                  sectionsOpen.options && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-col gap-3">
                {/* Difficulty */}
                <div className="rounded-2xl bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/70">난이도</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground/60">{difficultyLabels[difficulty[0]]}</span>
                      <span className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-[11px] font-bold text-white glow-sm">
                        {difficulty[0]}
                      </span>
                    </div>
                  </div>
                  <Slider
                    value={difficulty}
                    onValueChange={setDifficulty}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-1.5 flex justify-between">
                    {[1,2,3,4,5].map(n => (
                      <div key={n} className={cn("size-1 rounded-full transition-smooth", difficulty[0] >= n ? "bg-purple-400/60" : "bg-muted-foreground/20")} />
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="rounded-2xl bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/70">문제 수</Label>
                    <span className="rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-[11px] font-bold text-white glow-sm">
                      {questionCount[0]}문항
                    </span>
                  </div>
                  <Slider
                    value={questionCount}
                    onValueChange={setQuestionCount}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/50">
                    <span>1</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Question Types */}
                <div className="rounded-2xl bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/70">문제 유형</Label>
                    <span className="text-[11px] text-muted-foreground/50">{selectedTypes.length}개 선택</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {questionTypes.map((type) => (
                      <label
                        key={type.id}
                        className={cn(
                          "group/type flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-smooth",
                          selectedTypes.includes(type.id)
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 glow-sm"
                            : "border-transparent bg-background/30 text-foreground/50 hover:bg-accent/40 hover:text-foreground/70"
                        )}
                      >
                        <Checkbox
                          checked={selectedTypes.includes(type.id)}
                          onCheckedChange={() => toggleType(type.id)}
                          className="size-3.5 border-muted-foreground/30 data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500"
                        />
                        <span className="font-medium">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Generate Button */}
      <div className="px-4 pb-5 pt-2">
        <div className="divider-gradient mb-4" />

        {/* Pipeline error */}
        {pipelineError && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2.5">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-red-400" />
            <p className="text-[11px] leading-relaxed text-red-700 dark:text-red-300">{pipelineError}</p>
          </div>
        )}

        <Button
          disabled={(!isDemo && uploadedFiles.length === 0) || isGenerating}
          onClick={handleGenerate}
          className={cn(
            "btn-shine w-full rounded-2xl py-6 text-[13px] font-bold tracking-wide text-white shadow-xl transition-smooth active:scale-[0.98]",
            (!isDemo && uploadedFiles.length === 0) || isGenerating
              ? "bg-muted/30 text-foreground/30 shadow-none cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 shadow-purple-500/15 hover:shadow-purple-500/25 hover:brightness-110"
          )}
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {processingLabel}
            </>
          ) : processingStep === "done" ? (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              {processingLabel}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" />
              {processingLabel}
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
          {(isDemo || uploadedFiles.length > 0)
            ? `${isDemo ? "데모 모드" : `${uploadedFiles.length}개 파일`} · ${selectedTypes.length}개 유형 · ${questionCount[0]}문항 · 난이도 ${difficulty[0]}`
            : "파일을 업로드하면 문제를 생성할 수 있습니다"
          }
        </p>

        {/* Usage indicator — only shown for logged-in non-demo users */}
        {userId && !isDemo && (
          <div className="mt-4 rounded-2xl border border-border/20 bg-muted/10 px-3 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-foreground/30">이번 달 사용량</p>
            <UsageIndicator
              userId={userId}
              onUpgradeClick={() => window.location.href = "/pricing/"}
            />
          </div>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = "/EngenP/"
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[12px] font-medium text-foreground/35 transition-smooth hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="size-3.5" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
