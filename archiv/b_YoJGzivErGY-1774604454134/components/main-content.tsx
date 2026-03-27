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
    if (level <= 2) return "bg-emerald-100 text-emerald-700"
    if (level <= 3) return "bg-amber-100 text-amber-700"
    return "bg-rose-100 text-rose-700"
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      어법: "bg-blue-100 text-blue-700",
      어휘: "bg-purple-100 text-purple-700",
      "빈칸 추론": "bg-teal-100 text-teal-700",
      "순서 배열": "bg-orange-100 text-orange-700",
      "문장 삽입": "bg-pink-100 text-pink-700",
    }
    return colors[type] || "bg-gray-100 text-gray-700"
  }

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">2024 수능특강 영어 - 지문 1</h2>
            <p className="text-xs text-muted-foreground">Cultural Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="size-3" />
            3문항 생성 완료
          </Badge>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="passage" className="gap-2">
              <FileText className="size-4" />
              지문 원문
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2">
              <Sparkles className="size-4" />
              변형 문제
              <Badge className="ml-1 h-5 bg-primary/20 text-primary">{questions.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="passage" className="mt-4 flex-1 overflow-hidden">
            <Card className="h-full overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="secondary">EBS 수능특강</Badge>
                    <Badge variant="outline">영어</Badge>
                    <Badge variant="outline">2024</Badge>
                  </div>
                  <h3 className="mb-4 text-lg font-semibold text-foreground">
                    Cultural Intelligence in a Globalized World
                  </h3>
                  <div className="prose prose-sm max-w-none text-foreground">
                    {samplePassage.split("\n\n").map((paragraph, idx) => (
                      <p key={idx} className="mb-4 leading-relaxed text-foreground/90">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  <div className="mt-6 rounded-lg bg-muted/50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-foreground">지문 분석</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">247</p>
                        <p className="text-xs text-muted-foreground">단어 수</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">12.4</p>
                        <p className="text-xs text-muted-foreground">평균 문장 길이</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">B2</p>
                        <p className="text-xs text-muted-foreground">CEFR 레벨</p>
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
                  <Card key={q.id} className="overflow-hidden">
                    <div className="flex items-start gap-4 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className={getTypeColor(q.type)}>{q.type}</Badge>
                          <Badge className={getDifficultyColor(q.difficulty)}>
                            난이도 {q.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {q.grammarPoint}
                          </Badge>
                        </div>
                        <p className="mb-3 font-medium text-foreground">{q.question}</p>
                        <div className="mb-3 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
                          {q.content}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              className={`rounded-md border px-3 py-1.5 text-sm ${
                                optIdx + 1 === q.answer
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border text-foreground/80"
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
                        <Button variant="ghost" size="icon" className="size-8">
                          <Edit3 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleDelete(q.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8">
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
      <footer className="border-t border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>총 {questions.length}문항</span>
            <span>•</span>
            <span>평균 난이도 {(questions.reduce((a, b) => a + b.difficulty, 0) / questions.length).toFixed(1)}</span>
          </div>
          <Button size="lg" className="gap-2 bg-primary px-6 hover:bg-primary/90">
            <Download className="size-4" />
            Word(.docx) 파일로 추출
          </Button>
        </div>
      </footer>
    </main>
  )
}
