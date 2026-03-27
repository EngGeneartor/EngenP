"use client"

import { useState } from "react"
import { Upload, FileText, BarChart3, Settings2, ChevronDown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

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

export function LeftSidebar() {
  const [difficulty, setDifficulty] = useState([3])
  const [questionCount, setQuestionCount] = useState([5])
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["grammar", "vocabulary", "blank"])
  const [sectionsOpen, setSectionsOpen] = useState({
    upload: true,
    analysis: true,
    options: true,
  })

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  return (
    <aside className="flex h-full w-80 flex-col border-r border-border/50 bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 glow-purple">
          <Zap className="size-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-gradient">EngenP</h1>
          <p className="text-[11px] text-muted-foreground">AI 내신 변형 문제 생성기</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {/* Target Passage Upload */}
          <Collapsible
            open={sectionsOpen.upload}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, upload: open }))}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-accent">
              <div className="flex items-center gap-2.5">
                <Upload className="size-4 text-purple-400" />
                <span>타겟 지문 업로드</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-300",
                  sectionsOpen.upload && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="group rounded-xl border border-dashed border-border/80 bg-muted/30 p-6 text-center transition-smooth hover:border-purple-500/50 hover:bg-muted/50">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Upload className="size-5 text-purple-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  파일을 드래그하거나 클릭
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, JPG, PNG, TXT (최대 10MB)
                </p>
                <Button variant="outline" size="sm" className="mt-3 rounded-lg border-border/60 text-xs hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300">
                  파일 선택
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10 px-3 py-2.5">
                <FileText className="size-4 text-purple-400" />
                <span className="flex-1 truncate text-xs text-foreground/80">
                  2024_수능특강_영어_지문1.pdf
                </span>
                <button className="text-xs text-muted-foreground transition-smooth hover:text-red-400">
                  삭제
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Past Exam Style Analysis */}
          <Collapsible
            open={sectionsOpen.analysis}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, analysis: open }))}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-accent">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="size-4 text-indigo-400" />
                <span>기출 스타일 분석</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-300",
                  sectionsOpen.analysis && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="group rounded-xl border border-dashed border-border/80 bg-muted/30 p-5 text-center transition-smooth hover:border-indigo-500/50 hover:bg-muted/50">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-indigo-500/10">
                  <BarChart3 className="size-5 text-indigo-400" />
                </div>
                <p className="mt-2 text-xs font-medium text-foreground">
                  과거 기출 파일 업로드
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  AI가 출제 스타일을 분석합니다
                </p>
              </div>
              <div className="mt-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  분석 완료: <span className="font-semibold text-indigo-400">서울고 2024 1학기</span>
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Generation Options */}
          <Collapsible
            open={sectionsOpen.options}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, options: open }))}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-accent">
              <div className="flex items-center gap-2.5">
                <Settings2 className="size-4 text-violet-400" />
                <span>출제 옵션</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-300",
                  sectionsOpen.options && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex flex-col gap-3">
                {/* Difficulty */}
                <div className="rounded-xl bg-muted/30 p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground/80">난이도</Label>
                    <span className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      {difficulty[0]}
                    </span>
                  </div>
                  <Slider
                    value={difficulty}
                    onValueChange={setDifficulty}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>쉬움</span>
                    <span>어려움</span>
                  </div>
                </div>

                {/* Question Count */}
                <div className="rounded-xl bg-muted/30 p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground/80">문제 수</Label>
                    <span className="rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
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
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>1문항</span>
                    <span>20문항</span>
                  </div>
                </div>

                {/* Question Types */}
                <div className="rounded-xl bg-muted/30 p-3.5">
                  <Label className="mb-2.5 block text-xs font-medium text-foreground/80">
                    문제 유형
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {questionTypes.map((type) => (
                      <label
                        key={type.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-smooth",
                          selectedTypes.includes(type.id)
                            ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                            : "border-border/50 bg-background/30 text-foreground/60 hover:bg-accent/50 hover:text-foreground/80"
                        )}
                      >
                        <Checkbox
                          checked={selectedTypes.includes(type.id)}
                          onCheckedChange={() => toggleType(type.id)}
                          className="size-3.5"
                        />
                        <span>{type.label}</span>
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
      <div className="border-t border-border/50 p-4">
        <Button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-smooth hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/30" size="lg">
          <Zap className="mr-2 size-4" />
          문제 생성하기
        </Button>
      </div>
    </aside>
  )
}
