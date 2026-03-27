"use client"

import { useState } from "react"
import { Upload, FileText, BarChart3, Settings2, ChevronDown, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const questionTypes = [
  { id: "grammar", label: "어법", icon: "G" },
  { id: "vocabulary", label: "어휘", icon: "V" },
  { id: "blank", label: "빈칸 추론", icon: "B" },
  { id: "order", label: "순서 배열", icon: "O" },
  { id: "insertion", label: "문장 삽입", icon: "I" },
  { id: "title", label: "제목 추론", icon: "T" },
  { id: "purpose", label: "글의 목적", icon: "P" },
  { id: "summary", label: "요약문", icon: "S" },
  { id: "implication", label: "함축 의미", icon: "H" },
  { id: "mood", label: "심경 변화", icon: "M" },
]

export function LeftSidebar() {
  const [difficulty, setDifficulty] = useState([3])
  const [questionCount, setQuestionCount] = useState([5])
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["grammar", "vocabulary", "blank"])
  const [sectionsOpen, setSectionsOpen] = useState({
    upload: true,
    analysis: false,
    options: true,
  })

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    )
  }

  const difficultyLabels = ["", "매우 쉬움", "쉬움", "보통", "어려움", "매우 어려움"]

  return (
    <aside className="relative z-10 flex h-full w-[310px] flex-col bg-sidebar/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 glow-md">
          <Zap className="size-[18px] text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-extrabold tracking-tight text-gradient-bright">EngenP</h1>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground/70">AI 내신 변형 문제 생성기</p>
        </div>
      </div>

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
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground/50 transition-transform duration-300",
                  sectionsOpen.upload && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="group/drop rounded-2xl border border-dashed border-border/60 bg-muted/20 p-5 text-center transition-smooth hover:border-purple-500/40 hover:bg-purple-500/[0.03]">
                <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 transition-smooth group-hover/drop:from-purple-500/25 group-hover/drop:to-indigo-500/25">
                  <Upload className="size-5 text-purple-400/80" />
                </div>
                <p className="mt-3 text-[13px] font-medium text-foreground/80">
                  파일을 드래그하거나 클릭
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  PDF, JPG, PNG, TXT (최대 10MB)
                </p>
                <Button variant="outline" size="sm" className="mt-3 rounded-xl border-border/40 bg-transparent text-xs font-medium text-foreground/60 transition-smooth hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-300">
                  파일 선택
                </Button>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-purple-500/[0.06] border border-purple-500/[0.08] px-3.5 py-2.5 transition-smooth hover:bg-purple-500/[0.08]">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
                  <FileText className="size-3.5 text-purple-400" />
                </div>
                <span className="flex-1 truncate text-xs font-medium text-foreground/70">
                  2024_수능특강_영어_지문1.pdf
                </span>
                <button className="text-[11px] font-medium text-muted-foreground/50 transition-smooth hover:text-red-400">
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
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-foreground/80 transition-smooth hover:bg-accent/50">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-lg bg-indigo-500/15">
                  <BarChart3 className="size-3.5 text-indigo-400" />
                </div>
                <span>기출 스타일 분석</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">분석됨</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground/50 transition-transform duration-300",
                    sectionsOpen.analysis && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-center transition-smooth hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]">
                <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-indigo-500/15">
                  <BarChart3 className="size-4 text-indigo-400" />
                </div>
                <p className="mt-2 text-xs font-medium text-foreground/70">
                  과거 기출 파일 업로드
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                  AI가 출제 스타일을 분석합니다
                </p>
              </div>
              <div className="mt-2 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/[0.08] px-3.5 py-2.5">
                <p className="text-xs text-muted-foreground/80">
                  분석 완료: <span className="font-bold text-indigo-400">서울고 2024 1학기</span>
                </p>
              </div>
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
                    <Label className="text-xs font-semibold text-foreground/70">
                      문제 유형
                    </Label>
                    <span className="text-[11px] text-muted-foreground/50">{selectedTypes.length}개 선택</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {questionTypes.map((type) => (
                      <label
                        key={type.id}
                        className={cn(
                          "group/type flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-smooth",
                          selectedTypes.includes(type.id)
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-300 glow-sm"
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
        <Button className="btn-shine w-full rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 py-6 text-[13px] font-bold tracking-wide text-white shadow-xl shadow-purple-500/15 transition-smooth hover:shadow-purple-500/25 hover:brightness-110 active:scale-[0.98]" size="lg">
          <Sparkles className="mr-2 size-4" />
          문제 생성하기
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
          {selectedTypes.length}개 유형 · {questionCount[0]}문항 · 난이도 {difficulty[0]}
        </p>
      </div>
    </aside>
  )
}
