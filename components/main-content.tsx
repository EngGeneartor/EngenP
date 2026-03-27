"use client"

import { useState } from "react"
import { Edit3, Trash2, RefreshCw, Download, FileText, Sparkles, CheckCircle2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const samplePassage = `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) refers to an individual's capability to function effectively across various cultural contexts. Research has shown that individuals with high CQ are better equipped to navigate the complexities of cross-cultural interactions, whether in business negotiations, educational settings, or personal relationships.

The development of cultural intelligence involves four key components: cognitive, metacognitive, motivational, and behavioral. The cognitive aspect encompasses knowledge about different cultures, including their norms, practices, and conventions. Metacognitive CQ involves the mental processes used to acquire and understand cultural knowledge. Motivational CQ reflects an individual's drive and interest to adapt to new cultural situations. Finally, behavioral CQ represents the capability to exhibit appropriate verbal and nonverbal actions when interacting with people from different cultures.

Studies have demonstrated that cultural intelligence can be developed and enhanced through targeted training and cross-cultural experiences. Organizations increasingly recognize the value of CQ in their workforce, as employees with high cultural intelligence tend to perform better in international assignments and multicultural team settings.`

const sampleQuestions = [
  {
    id: 1,
    type: "어법",
    difficulty: 3,
    question:
      "밑줄 친 (A), (B), (C)에서 어법에 맞는 표현으로 가장 적절한 것은?",
    content: `The concept of "cultural intelligence" has emerged as a critical competency in our increasingly globalized world. Unlike traditional measures of intelligence, cultural intelligence (CQ) (A) [refers / referring] to an individual's capability to function effectively across various cultural contexts. Research has shown that individuals with high CQ (B) [is / are] better equipped to navigate the complexities of cross-cultural interactions.`,
    options: [
      "(A) refers - (B) is",
      "(A) refers - (B) are",
      "(A) referring - (B) is",
      "(A) referring - (B) are",
    ],
    answer: 2,
    grammarPoint: "주어-동사 수일치",
  },
  {
    id: 2,
    type: "빈칸 추론",
    difficulty: 4,
    question:
      "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
    content: `The development of cultural intelligence involves four key components. The cognitive aspect encompasses knowledge about different cultures. Metacognitive CQ involves the mental processes used to acquire cultural knowledge. This suggests that cultural intelligence is not just about ____________, but also about how we process and apply that knowledge in real situations.`,
    options: [
      "accumulating information",
      "avoiding conflicts",
      "expressing emotions",
      "maintaining traditions",
      "building relationships",
    ],
    answer: 1,
    grammarPoint: "글의 흐름 파악",
  },
  {
    id: 3,
    type: "어휘",
    difficulty: 2,
    question:
      "밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
    content: `Organizations increasingly recognize the value of CQ in their workforce. Employees with high cultural intelligence tend to ①perform better in international assignments. Their ability to ②adapt to new cultural situations makes them ③valuable assets. However, those who ④lack cultural awareness may ⑤succeed in multicultural team settings.`,
    options: ["perform", "adapt", "valuable", "lack", "succeed"],
    answer: 5,
    grammarPoint: "문맥상 어휘 선택",
  },
]

export function MainContent() {
  const [activeTab, setActiveTab] = useState("passage")
  const [questions, setQuestions] = useState(sampleQuestions)

  const handleDelete = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    if (level <= 3) return "border-amber-500/30 bg-amber-500/10 text-amber-400"
    return "border-rose-500/30 bg-rose-500/10 text-rose-400"
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      어법: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      어휘: "border-purple-500/30 bg-purple-500/10 text-purple-400",
      "빈칸 추론": "border-teal-500/30 bg-teal-500/10 text-teal-400",
      "순서 배열": "border-orange-500/30 bg-orange-500/10 text-orange-400",
      "문장 삽입": "border-pink-500/30 bg-pink-500/10 text-pink-400",
    }
    return colors[type] || "border-gray-500/30 bg-gray-500/10 text-gray-400"
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/50 bg-card/50 px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
            <Sparkles className="size-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">2024 수능특강 영어 - 지문 1</h2>
            <p className="text-xs text-muted-foreground">Cultural Intelligence</p>
          </div>
        </div>
        <Badge className="gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          3문항 생성 완료
        </Badge>
      </header>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="w-fit rounded-xl bg-secondary/60 p-1">
            <TabsTrigger value="passage" className="gap-2 rounded-lg px-4 text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              <FileText className="size-4" />
              지문 원문
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2 rounded-lg px-4 text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              <Sparkles className="size-4" />
              변형 문제
              <span className="ml-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-purple-400">{questions.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="passage" className="mt-4 flex-1 overflow-hidden">
            <Card className="h-full overflow-hidden rounded-xl border-border/50 bg-card/60">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Badge className="rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400 text-xs">EBS 수능특강</Badge>
                    <Badge className="rounded-md border border-border/50 bg-secondary/40 text-muted-foreground text-xs">영어</Badge>
                    <Badge className="rounded-md border border-border/50 bg-secondary/40 text-muted-foreground text-xs">2024</Badge>
                  </div>
                  <h3 className="mb-5 text-lg font-bold tracking-tight text-foreground">
                    Cultural Intelligence in a Globalized World
                  </h3>
                  <div className="max-w-none">
                    {samplePassage.split("\n\n").map((paragraph, idx) => (
                      <p key={idx} className="mb-4 text-sm leading-[1.8] text-foreground/75">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  <div className="mt-8 rounded-xl bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/10 p-5">
                    <h4 className="mb-3 text-sm font-semibold text-foreground/80">지문 분석</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-2xl font-bold text-gradient">247</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">단어 수</p>
                      </div>
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-2xl font-bold text-gradient">12.4</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">평균 문장 길이</p>
                      </div>
                      <div className="rounded-lg bg-background/40 p-3">
                        <p className="text-2xl font-bold text-gradient">B2</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">CEFR 레벨</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 pb-4">
                {questions.map((q, index) => (
                  <Card key={q.id} className="overflow-hidden rounded-xl border-border/50 bg-card/60 transition-smooth hover:border-purple-500/20">
                    <div className="flex items-start gap-4 p-5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-purple-500/10">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge className={`rounded-md border text-xs ${getTypeColor(q.type)}`}>{q.type}</Badge>
                          <Badge className={`rounded-md border text-xs ${getDifficultyColor(q.difficulty)}`}>
                            난이도 {q.difficulty}
                          </Badge>
                          <Badge className="rounded-md border border-border/40 bg-secondary/30 text-xs text-muted-foreground">
                            {q.grammarPoint}
                          </Badge>
                        </div>
                        <p className="mb-3 text-sm font-medium text-foreground/90">{q.question}</p>
                        <div className="mb-4 rounded-lg bg-muted/30 border border-border/30 p-4 text-sm leading-[1.8] text-foreground/70">
                          {q.content}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              className={`rounded-lg border px-3.5 py-2 text-sm transition-smooth ${
                                optIdx + 1 === q.answer
                                  ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                                  : "border-border/30 text-foreground/60 hover:bg-muted/30"
                              }`}
                            >
                              <span className="mr-2 font-medium">
                                {String.fromCharCode(9312 + optIdx)}
                              </span>
                              {option}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10">
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10">
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>총 {questions.length}문항</span>
            <span className="text-border">|</span>
            <span>평균 난이도 {(questions.reduce((a, b) => a + b.difficulty, 0) / questions.length).toFixed(1)}</span>
          </div>
          <Button className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:from-purple-500 hover:to-indigo-500" size="lg">
            <Download className="mr-2 size-4" />
            Word(.docx) 추출
          </Button>
        </div>
      </footer>
    </main>
  )
}
