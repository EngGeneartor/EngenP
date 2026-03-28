"use client"

import { useState, useEffect } from "react"
import { Edit3, Trash2, RefreshCw, Download, Sparkles, CheckCircle2, Eye, BookOpen, ZoomIn, ZoomOut, RotateCw, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/theme-toggle"
import type { UploadedFile } from "@/lib/types"

interface MainContentProps {
  selectedFile: UploadedFile | null
  uploadedFiles: UploadedFile[]
}

/* ═══ Sample Data (승규 원본) ═══ */

const samplePassage = `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) refers to an individual's capability to function effectively across various cultural contexts. Research has shown that individuals with high CQ are better equipped to navigate the complexities of cross-cultural interactions, whether in business negotiations, educational settings, or personal relationships.

The development of cultural intelligence involves four key components: cognitive, metacognitive, motivational, and behavioral. The cognitive aspect encompasses knowledge about different cultures, including their norms, practices, and conventions. Metacognitive CQ involves the mental processes used to acquire and understand cultural knowledge. Motivational CQ reflects an individual's drive and interest to adapt to new cultural situations. Finally, behavioral CQ represents the capability to exhibit appropriate verbal and nonverbal actions when interacting with people from different cultures.

Studies have demonstrated that cultural intelligence can be developed and enhanced through targeted training and cross-cultural experiences. Organizations increasingly recognize the value of CQ in their workforce, as employees with high cultural intelligence tend to perform better in international assignments and multicultural team settings.`

const sampleQuestions = [
  {
    id: 1, type: "어법", difficulty: 3,
    question: "밑줄 친 (A), (B), (C)에서 어법에 맞는 표현으로 가장 적절한 것은?",
    content: `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) (A) [refers / referring] to an individual's capability to function effectively across various cultural contexts. Research has shown that individuals with high CQ (B) [is / are] better equipped to navigate the complexities of cross-cultural interactions.`,
    options: ["(A) refers - (B) is", "(A) refers - (B) are", "(A) referring - (B) is", "(A) referring - (B) are"],
    answer: 2, grammarPoint: "주어-동사 수일치",
  },
  {
    id: 2, type: "빈칸 추론", difficulty: 4,
    question: "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
    content: `The development of cultural intelligence involves four key components. The cognitive aspect encompasses knowledge about different cultures. Metacognitive CQ involves the mental processes used to acquire cultural knowledge. This suggests that cultural intelligence is not just about ____________, but also about how we process and apply that knowledge in real situations.`,
    options: ["accumulating information", "avoiding conflicts", "expressing emotions", "maintaining traditions", "building relationships"],
    answer: 1, grammarPoint: "글의 흐름 파악",
  },
  {
    id: 3, type: "어휘", difficulty: 2,
    question: "밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
    content: `Organizations increasingly recognize the value of CQ in their workforce. Employees with high cultural intelligence tend to ①perform better in international assignments. Their ability to ②adapt to new cultural situations makes them ③valuable assets. However, those who ④lack cultural awareness may ⑤succeed in multicultural team settings.`,
    options: ["perform", "adapt", "valuable", "lack", "succeed"],
    answer: 5, grammarPoint: "문맥상 어휘 선택",
  },
]

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
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80" onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut className="size-4" /></Button>
        <span className="min-w-[50px] text-center text-[12px] font-medium text-foreground/50">{zoom}%</span>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80" onClick={() => setZoom(z => Math.min(300, z + 25))}><ZoomIn className="size-4" /></Button>
        <div className="mx-2 h-4 w-px bg-border/30" />
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80" onClick={() => setRotation(r => (r + 90) % 360)}><RotateCw className="size-4" /></Button>
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

/* ═══ Helper ═══ */

function getDifficultyColor(level: number) {
  if (level <= 2) return "border-emerald-500/25 bg-emerald-500/8 text-emerald-400"
  if (level <= 3) return "border-amber-500/25 bg-amber-500/8 text-amber-400"
  return "border-rose-500/25 bg-rose-500/8 text-rose-400"
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    어법: "border-sky-500/25 bg-sky-500/8 text-sky-400",
    어휘: "border-purple-500/25 bg-purple-500/8 text-purple-400",
    "빈칸 추론": "border-teal-500/25 bg-teal-500/8 text-teal-400",
  }
  return colors[type] || "border-gray-500/25 bg-gray-500/8 text-gray-400"
}

function getFileExtension(name: string) { return name.split('.').pop()?.toUpperCase() || '' }

/* ═══ Main Component ═══ */

export function MainContent({ selectedFile, uploadedFiles }: MainContentProps) {
  const [activeTab, setActiveTab] = useState("passage")
  const [questions, setQuestions] = useState(sampleQuestions)

  const handleDelete = (id: number) => setQuestions(questions.filter((q) => q.id !== id))

  // 파일 선택되면 자동으로 viewer 탭으로
  useEffect(() => {
    if (selectedFile) setActiveTab("viewer")
  }, [selectedFile])

  return (
    <main className="relative z-10 flex flex-1 flex-col">
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
              {activeTab === "viewer" && selectedFile ? selectedFile.name : "2024 수능특강 영어 - 지문 1"}
            </h2>
            <p className="text-[12px] font-medium text-muted-foreground/60">
              {activeTab === "viewer" && selectedFile
                ? `${getFileExtension(selectedFile.name)} · ${(selectedFile.size / 1024).toFixed(1)}KB`
                : "Cultural Intelligence in a Globalized World"
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
          {questions.length > 0 && activeTab !== "viewer" && (
            <Badge className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400 gap-1.5">
              <Sparkles className="size-3" />
              {questions.length}문항
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
              <span className="ml-1 flex size-5 items-center justify-center rounded-md bg-purple-500/20 text-[10px] font-bold text-purple-400">{questions.length}</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══ 지문 원문 (샘플) ═══ */}
          <TabsContent value="passage" className="mt-5 flex-1 overflow-hidden">
            <div className="glass-card h-full overflow-hidden rounded-2xl">
              <ScrollArea className="h-full">
                <div className="p-7">
                  <div className="mb-5 flex items-center gap-2">
                    <span className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400">EBS 수능특강</span>
                    <span className="pill border border-border/30 bg-muted/20 text-muted-foreground/60">영어</span>
                    <span className="pill border border-border/30 bg-muted/20 text-muted-foreground/60">2024</span>
                  </div>
                  <h3 className="mb-6 text-xl font-bold tracking-tight text-foreground/90">
                    Cultural Intelligence in a Globalized World
                  </h3>
                  {samplePassage.split("\n\n").map((paragraph, idx) => (
                    <p key={idx} className="mb-5 text-[13.5px] leading-[1.9] text-foreground/65 selection:bg-purple-500/20">{paragraph}</p>
                  ))}
                  <div className="mt-10 rounded-2xl gradient-border bg-gradient-to-br from-purple-500/[0.06] via-indigo-500/[0.03] to-violet-500/[0.06] border border-purple-500/[0.08] p-6">
                    <h4 className="mb-4 text-[13px] font-bold tracking-wide text-foreground/70">지문 분석</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ value: "247", label: "단어 수" }, { value: "12.4", label: "평균 문장 길이" }, { value: "B2", label: "CEFR 레벨" }].map((stat) => (
                        <div key={stat.label} className="rounded-xl bg-background/30 p-4 text-center">
                          <p className="text-2xl font-extrabold tracking-tight text-gradient">{stat.value}</p>
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground/50">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
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
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/40">
                      좌측에서 PDF, JPG, PNG, TXT 파일을 업로드하면<br />
                      여기에서 내용을 확인할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {["PDF", "JPG", "PNG", "TXT"].map(ext => (
                      <span key={ext} className="pill border border-border/30 bg-muted/20 text-muted-foreground/50">{ext}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ 변형 문제 ═══ */}
          <TabsContent value="questions" className="mt-5 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 pb-4">
                {questions.map((q, index) => (
                  <div key={q.id} className="glass-card hover-lift rounded-2xl overflow-hidden">
                    <div className="flex items-start gap-4 p-5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-lg font-extrabold text-white shadow-lg shadow-purple-500/15">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`pill border ${getTypeColor(q.type)}`}>{q.type}</span>
                          <span className={`pill border ${getDifficultyColor(q.difficulty)}`}>Lv.{q.difficulty}</span>
                          <span className="pill border border-border/20 bg-muted/15 text-muted-foreground/50">{q.grammarPoint}</span>
                        </div>
                        <p className="mb-3 text-[13px] font-semibold leading-relaxed text-foreground/85">{q.question}</p>
                        <div className="mb-4 rounded-xl bg-background/30 border border-border/20 p-4 text-[13px] leading-[1.85] text-foreground/60">{q.content}</div>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((option, optIdx) => (
                            <div key={optIdx} className={`rounded-xl border px-4 py-2.5 text-[13px] transition-smooth ${optIdx + 1 === q.answer ? "border-purple-500/25 bg-purple-500/[0.07] text-purple-700 dark:text-purple-300 font-medium" : "border-border/15 text-foreground/50 hover:bg-muted/20"}`}>
                              <span className="mr-2.5 font-semibold text-foreground/30">{String.fromCharCode(9312 + optIdx)}</span>
                              {option}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground/40 hover:text-purple-400 hover:bg-purple-500/10"><Edit3 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(q.id)}><Trash2 className="size-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground/40 hover:text-indigo-400 hover:bg-indigo-500/10"><RefreshCw className="size-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="divider-gradient mx-6" />
      <footer className="px-7 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="font-medium text-foreground/50">총 {questions.length}문항</span>
            <span className="size-1 rounded-full bg-muted-foreground/20" />
            <span className="font-medium text-foreground/50">평균 난이도 {(questions.reduce((a, b) => a + b.difficulty, 0) / questions.length).toFixed(1)}</span>
          </div>
          <Button className="btn-shine rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-7 py-5 text-[13px] font-bold text-white shadow-xl shadow-purple-500/15 transition-smooth hover:shadow-purple-500/25 hover:brightness-110 active:scale-[0.98]" size="lg">
            <Download className="mr-2 size-4" />
            Word(.docx) 추출
          </Button>
        </div>
      </footer>
    </main>
  )
}
