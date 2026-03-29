"use client"

import { useState, useEffect } from "react"
import { Edit3, Trash2, RefreshCw, Download, Sparkles, CheckCircle2, Eye, BookOpen, ZoomIn, ZoomOut, RotateCw, Upload, Loader2, AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/theme-toggle"
import type { UploadedFile, StructuredPassage, GeneratedQuestion } from "@/lib/types"
import { exportDocx, exportHwpx } from "@/lib/api-client"
import type { ProcessingStep } from "@/app/dashboard/page"

interface MainContentProps {
  selectedFile: UploadedFile | null
  uploadedFiles: UploadedFile[]
  structuredPassage?: StructuredPassage | null
  generatedQuestions?: GeneratedQuestion[]
  isProcessing?: boolean
  processingStep?: ProcessingStep
  isDemo?: boolean
}

/* ═══ File Viewers ═══ */

function PDFViewer({ url }: { url: string }) {
  return (
    <iframe src={`${url}#toolbar=1&navpanes=0&view=FitH`} className="h-full w-full rounded-xl border-0" title="PDF Viewer" />
  )
}

function ImageViewer({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-b border-border/20 py-3">
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/65 hover:text-foreground/80" onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut className="size-4" /></Button>
        <span className="min-w-[50px] text-center text-[12px] font-medium text-foreground/65">{zoom}%</span>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/65 hover:text-foreground/80" onClick={() => setZoom(z => Math.min(300, z + 25))}><ZoomIn className="size-4" /></Button>
        <div className="mx-2 h-4 w-px bg-border/30" />
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/65 hover:text-foreground/80" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="size-4" /></Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex min-h-full items-center justify-center p-8">
          <img src={url} alt={name} className="max-w-full transition-all duration-300" style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }} />
        </div>
      </ScrollArea>
    </div>
  )
}

function TextViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(url).then(r => r.text()).then(text => { setContent(text); setLoading(false) }).catch(() => { setContent("파일을 불러올 수 없습니다."); setLoading(false) })
  }, [url])
  if (loading) return <div className="flex h-full items-center justify-center"><div className="size-6 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" /></div>
  return <ScrollArea className="h-full"><pre className="whitespace-pre-wrap p-6 text-[13px] leading-[1.8] text-foreground/70 font-mono">{content}</pre></ScrollArea>
}

/* ═══ Helpers ═══ */

function getDifficultyColor(level: number) {
  if (level <= 2) return "border-emerald-500/25 bg-emerald-500/8 text-emerald-400"
  if (level <= 3) return "border-amber-500/25 bg-amber-500/8 text-amber-400"
  return "border-rose-500/25 bg-rose-500/8 text-rose-400"
}

function getTypeColor(typeId: string) {
  const colors: Record<string, string> = {
    grammar_choice:     "border-sky-500/25 bg-sky-500/8 text-sky-400",
    vocabulary_choice:  "border-purple-500/25 bg-purple-500/8 text-purple-400",
    blank_inference:    "border-teal-500/25 bg-teal-500/8 text-teal-400",
    sentence_ordering:  "border-orange-500/25 bg-orange-500/8 text-orange-400",
    sentence_insertion: "border-pink-500/25 bg-pink-500/8 text-pink-400",
    topic_summary:      "border-indigo-500/25 bg-indigo-500/8 text-indigo-400",
  }
  return colors[typeId] || "border-gray-500/25 bg-gray-500/8 text-gray-400"
}

const TYPE_LABEL: Record<string, string> = {
  grammar_choice:     "어법",
  vocabulary_choice:  "어휘",
  blank_inference:    "빈칸 추론",
  sentence_ordering:  "순서 배열",
  sentence_insertion: "문장 삽입",
  topic_summary:      "제목·요약",
}

function getTypeLabel(typeId: string) {
  return TYPE_LABEL[typeId] ?? typeId
}

function getFileExtension(name: string) { return name.split('.').pop()?.toUpperCase() || '' }

/* ═══ Processing overlay ═══ */

function ProcessingOverlay({ step }: { step: ProcessingStep }) {
  const label =
    step === "structurizing" ? "지문 분석 중..." :
    step === "generating"    ? "문제 생성 중..." :
    step === "exporting"     ? "내보내는 중..."  : "처리 중..."

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
        <Loader2 className="size-9 animate-spin text-purple-400/60" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-bold text-foreground/70">{label}</p>
        <p className="mt-1 text-[12px] text-foreground/60">Haean AI가 처리하고 있습니다</p>
      </div>
      <div className="flex gap-1.5">
        {(["structurizing", "generating"] as ProcessingStep[]).map((s) => {
          const active = s === step
          const done   = step === "generating" && s === "structurizing"
          return (
            <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${done ? "bg-emerald-400/60" : active ? "bg-purple-400 animate-pulse" : "bg-muted/30"}`} />
          )
        })}
      </div>
    </div>
  )
}

/* ═══ Main Component ═══ */

export function MainContent({
  selectedFile,
  uploadedFiles,
  structuredPassage,
  generatedQuestions = [],
  isProcessing = false,
  processingStep = "idle",
  isDemo = false,
}: MainContentProps) {
  const [activeTab, setActiveTab] = useState("passage")
  const [localQuestions, setLocalQuestions] = useState<GeneratedQuestion[]>([])
  const [isExporting, setIsExporting] = useState<false | 'docx' | 'hwpx'>(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Keep local questions in sync with incoming generated questions
  useEffect(() => {
    if (generatedQuestions.length > 0) {
      setLocalQuestions(generatedQuestions)
    }
  }, [generatedQuestions])

  // Switch to questions tab when generation completes
  useEffect(() => {
    if (processingStep === "done" && generatedQuestions.length > 0) {
      setActiveTab("questions")
    }
  }, [processingStep, generatedQuestions.length])

  // Switch to viewer tab when a new file is selected (only if not processing)
  useEffect(() => {
    if (selectedFile && processingStep === "idle") {
      setActiveTab("viewer")
    }
  }, [selectedFile])

  const handleDelete = (questionNumber: number) => {
    setLocalQuestions(prev => prev.filter(q => q.question_number !== questionNumber))
  }

  const handleExport = async (format: 'docx' | 'hwpx') => {
    if (!structuredPassage || localQuestions.length === 0) return
    setIsExporting(format)
    setExportError(null)
    try {
      const base = structuredPassage.title ?? "exam-questions"
      if (format === 'docx') {
        await exportDocx(localQuestions, structuredPassage, `${base}.docx`)
      } else {
        await exportHwpx(localQuestions, structuredPassage, `${base}.hwpx`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "내보내기에 실패했습니다."
      setExportError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  const displayQuestions = localQuestions
  const avgDifficulty = displayQuestions.length > 0
    ? (displayQuestions.reduce((a, b) => a + b.difficulty, 0) / displayQuestions.length).toFixed(1)
    : "-"

  const isGenerating = processingStep === "structurizing" || processingStep === "generating"

  return (
    <main className="relative z-10 flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
            <BookOpen className="size-5 text-purple-400/80" />
            {uploadedFiles.length > 0 && (
              <div className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-400 animate-pulse-ring" />
            )}
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-foreground/90">
              {structuredPassage?.title
                ? structuredPassage.title
                : activeTab === "viewer" && selectedFile
                  ? selectedFile.name
                  : "지문 분석 결과"}
            </h2>
            <p className="text-[12px] font-medium text-muted-foreground/60">
              {structuredPassage
                ? `${structuredPassage.wordCount}단어 · 난이도 ${structuredPassage.estimatedDifficulty} · ${structuredPassage.topics.slice(0, 2).join(", ")}`
                : activeTab === "viewer" && selectedFile
                  ? `${getFileExtension(selectedFile.name)} · ${(selectedFile.size / 1024).toFixed(1)}KB`
                  : "업로드된 지문이 없습니다"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadedFiles.length > 0 && (
            <Badge className="pill border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 gap-1.5">
              <CheckCircle2 className="size-3" />
              {uploadedFiles.length}개 파일 업로드
            </Badge>
          )}
          {displayQuestions.length > 0 && activeTab !== "viewer" && (
            <Badge className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400 gap-1.5">
              <Sparkles className="size-3" />
              {displayQuestions.length}문항
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="divider-gradient mx-6" />

      {/* Tabs */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="w-fit rounded-2xl bg-muted/30 p-1 backdrop-blur-sm">
            <TabsTrigger value="passage" className="gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-smooth data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
              <Eye className="size-4" />
              지문 원문
            </TabsTrigger>
            <TabsTrigger value="viewer" className="gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-smooth data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
              <Upload className="size-4" />
              타겟 지문
              {uploadedFiles.length > 0 && (
                <span className="ml-1 flex size-5 items-center justify-center rounded-md bg-emerald-500/20 text-[10px] font-bold text-emerald-400">{uploadedFiles.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-smooth data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
              <Sparkles className="size-4" />
              변형 문제
              <span className="ml-1 flex size-5 items-center justify-center rounded-md bg-purple-500/20 text-[10px] font-bold text-purple-400">{displayQuestions.length}</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══ 지문 원문 ═══ */}
          <TabsContent value="passage" className="mt-5 flex-1 overflow-hidden">
            <div className="glass-card h-full overflow-hidden rounded-2xl">
              {isGenerating && processingStep === "structurizing" ? (
                <ProcessingOverlay step={processingStep} />
              ) : structuredPassage ? (
                <ScrollArea className="h-full">
                  <div className="p-7">
                    {/* Tags */}
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      {structuredPassage.topics.map(topic => (
                        <span key={topic} className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400">{topic}</span>
                      ))}
                      <span className="pill border border-border/30 bg-muted/20 text-muted-foreground/60">
                        난이도 {structuredPassage.estimatedDifficulty}
                      </span>
                    </div>

                    {/* Title */}
                    {structuredPassage.title && (
                      <h3 className="mb-6 text-xl font-bold tracking-tight text-foreground/90">
                        {structuredPassage.title}
                      </h3>
                    )}

                    {/* Paragraphs */}
                    {structuredPassage.paragraphs.map((para) => (
                      <p key={para.index} className="mb-5 text-[13.5px] leading-[1.9] text-foreground/65 selection:bg-purple-500/20">
                        {para.rawText}
                      </p>
                    ))}

                    {/* Stats + Key Vocab */}
                    <div className="mt-10 rounded-2xl gradient-border bg-gradient-to-br from-purple-500/[0.06] via-indigo-500/[0.03] to-violet-500/[0.06] border border-purple-500/[0.08] p-6">
                      <h4 className="mb-4 text-[13px] font-bold tracking-wide text-foreground/70">지문 분석</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: String(structuredPassage.wordCount), label: "단어 수" },
                          { value: String(structuredPassage.estimatedDifficulty), label: "난이도 (1-5)" },
                          { value: String(structuredPassage.paragraphs.length), label: "단락 수" },
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-xl bg-background/30 p-4 text-center">
                            <p className="text-2xl font-extrabold tracking-tight text-gradient">{stat.value}</p>
                            <p className="mt-1 text-[11px] font-medium text-muted-foreground/70">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Key Vocab */}
                      {structuredPassage.keyVocab.length > 0 && (
                        <div className="mt-5">
                          <h5 className="mb-3 text-[12px] font-semibold text-foreground/60">핵심 어휘</h5>
                          <div className="flex flex-wrap gap-2">
                            {structuredPassage.keyVocab.slice(0, 12).map((v, i) => (
                              <div key={i} className="group relative rounded-xl border border-border/20 bg-background/30 px-3 py-1.5">
                                <span className="text-[12px] font-semibold text-foreground/70">{v.word}</span>
                                <span className="ml-1.5 text-[10px] text-muted-foreground/70">{v.pos}</span>
                                {v.definitionKo && (
                                  <div className="absolute bottom-full left-0 z-10 mb-1.5 hidden rounded-xl border border-border/30 bg-background/95 px-3 py-2 shadow-xl group-hover:block">
                                    <p className="text-[11px] font-medium text-foreground/80">{v.definitionKo}</p>
                                    <p className="text-[10px] text-muted-foreground/60">{v.definition}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                  <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                    <Eye className="size-9 text-purple-400/40" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-foreground/70">지문을 생성해주세요</h3>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/60">
                      좌측에서 파일을 업로드하고<br />
                      &ldquo;문제 생성하기&rdquo; 버튼을 누르면<br />
                      AI가 지문을 분석합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ 타겟 지문 (업로드된 파일 뷰어) ═══ */}
          <TabsContent value="viewer" className="mt-5 flex-1 overflow-hidden">
            <div className="glass-card h-full overflow-hidden rounded-2xl">
              {selectedFile ? (
                <>
                  {selectedFile.type === "application/pdf" && selectedFile.publicUrl && (
                    <PDFViewer url={selectedFile.publicUrl} />
                  )}
                  {selectedFile.type.startsWith("image/") && selectedFile.publicUrl && (
                    <ImageViewer url={selectedFile.publicUrl} name={selectedFile.name} />
                  )}
                  {selectedFile.type === "text/plain" && selectedFile.publicUrl && (
                    <TextViewer url={selectedFile.publicUrl} />
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                  <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                    <Upload className="size-9 text-purple-400/40" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-foreground/70">지문을 업로드해주세요</h3>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/60">
                      좌측에서 PDF, JPG, PNG, TXT 파일을 업로드하면<br />
                      여기에서 내용을 확인할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {["PDF", "JPG", "PNG", "TXT"].map(ext => (
                      <span key={ext} className="pill border border-border/30 bg-muted/20 text-muted-foreground/70">{ext}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ 변형 문제 ═══ */}
          <TabsContent value="questions" className="mt-5 flex-1 overflow-hidden">
            {isGenerating ? (
              <div className="glass-card h-full overflow-hidden rounded-2xl">
                <ProcessingOverlay step={processingStep} />
              </div>
            ) : displayQuestions.length > 0 ? (
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pb-4">
                  {displayQuestions.map((q, index) => (
                    <div key={q.question_number} className="glass-card hover-lift rounded-2xl overflow-hidden">
                      <div className="flex items-start gap-4 p-5">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-purple-500/15">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={`pill border ${getTypeColor(q.type_id)}`}>{getTypeLabel(q.type_id)}</span>
                            <span className={`pill border ${getDifficultyColor(q.difficulty)}`}>Lv.{q.difficulty}</span>
                            {q.test_point && (
                              <span className="pill border border-border/20 bg-muted/15 text-muted-foreground/70">{q.test_point}</span>
                            )}
                          </div>
                          <p className="mb-3 text-[13px] font-semibold leading-relaxed text-foreground/85">{q.instruction}</p>
                          {(q.passage_with_markers || q.rawPassage) && (
                            <div className="mb-4 rounded-xl bg-background/30 border border-border/20 p-4 text-[13px] leading-[1.85] text-foreground/60">
                              {q.passage_with_markers || q.rawPassage}
                            </div>
                          )}
                          {q.choices && q.choices.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {q.choices.map((option, optIdx) => {
                                // Match answer against the circled-number prefix or literal option text
                                const circled = String.fromCharCode(9312 + optIdx)
                                const isAnswer =
                                  q.answer === circled ||
                                  q.answer === String(optIdx + 1) ||
                                  q.answer.startsWith(circled) ||
                                  q.answer === option
                                return (
                                  <div
                                    key={optIdx}
                                    className={`rounded-xl border px-4 py-2.5 text-[13px] transition-smooth ${isAnswer ? "border-purple-500/25 bg-purple-500/[0.07] text-purple-700 dark:text-purple-300 font-medium" : "border-border/15 text-foreground/65 hover:bg-muted/20"}`}
                                  >
                                    <span className="mr-2.5 font-semibold text-foreground/50">{circled}</span>
                                    {option}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {q.explanation && (
                            <div className="mt-3 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.04] px-4 py-3">
                              <p className="text-[11px] font-semibold text-indigo-400/80 mb-1">해설</p>
                              <p className="text-[12px] leading-relaxed text-foreground/55">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground/65 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(q.question_number)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground/65 hover:text-indigo-400 hover:bg-indigo-500/10">
                            <RefreshCw className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="glass-card flex h-full flex-col items-center justify-center gap-5 rounded-2xl text-center">
                <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <Sparkles className="size-9 text-purple-400/40" />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-foreground/70">생성된 문제가 없습니다</h3>
                  <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/60">
                    좌측에서 &ldquo;문제 생성하기&rdquo; 버튼을 누르면<br />
                    AI가 변형 문제를 생성합니다.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="divider-gradient mx-6" />
      <footer className="px-7 py-4">
        {exportError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/15 px-3 py-2">
            <AlertCircle className="size-3.5 shrink-0 text-red-400" />
            <p className="text-[11px] text-red-700 dark:text-red-300">{exportError}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="font-medium text-foreground/65">총 {displayQuestions.length}문항</span>
            <span className="size-1 rounded-full bg-muted-foreground/20" />
            <span className="font-medium text-foreground/65">평균 난이도 {avgDifficulty}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* .docx download */}
            <Button
              onClick={() => handleExport('docx')}
              disabled={!!isExporting || displayQuestions.length === 0 || !structuredPassage}
              className={`btn-shine rounded-2xl px-5 py-5 text-[13px] font-bold text-white shadow-xl transition-smooth active:scale-[0.98] ${
                displayQuestions.length > 0 && structuredPassage && !isExporting
                  ? "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 shadow-purple-500/15 hover:shadow-purple-500/25 hover:brightness-110"
                  : "bg-muted/30 text-foreground/50 shadow-none cursor-not-allowed"
              }`}
              size="lg"
            >
              {isExporting === 'docx' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  내보내는 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  Word (.docx)
                </>
              )}
            </Button>

            {/* .hwpx download */}
            <Button
              onClick={() => handleExport('hwpx')}
              disabled={!!isExporting || displayQuestions.length === 0 || !structuredPassage}
              className={`btn-shine rounded-2xl px-5 py-5 text-[13px] font-bold text-white shadow-xl transition-smooth active:scale-[0.98] ${
                displayQuestions.length > 0 && structuredPassage && !isExporting
                  ? "bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 shadow-teal-500/15 hover:shadow-teal-500/25 hover:brightness-110"
                  : "bg-muted/30 text-foreground/50 shadow-none cursor-not-allowed"
              }`}
              size="lg"
            >
              {isExporting === 'hwpx' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  내보내는 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  한글 (.hwpx)
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </main>
  )
}
