"use client"

import { useState } from "react"
import { Upload, FileText, BarChart3, Settings2, FileQuestion, ChevronDown } from "lucide-react"
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
    <aside className="flex h-full w-80 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <FileQuestion className="size-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">EduGen AI</h1>
          <p className="text-xs text-muted-foreground">내신 변형 문제 생성기</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {/* Target Passage Upload */}
          <Collapsible
            open={sectionsOpen.upload}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, upload: open }))}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent">
              <div className="flex items-center gap-2">
                <Upload className="size-4" />
                <span>타겟 지문 업로드</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  sectionsOpen.upload && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted">
                <Upload className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, JPG, PNG, TXT 지원 (최대 10MB)
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  파일 선택
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
                <FileText className="size-4 text-primary" />
                <span className="flex-1 truncate text-xs text-foreground">
                  2024_수능특강_영어_지문1.pdf
                </span>
                <button className="text-xs text-muted-foreground hover:text-destructive">
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
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4" />
                <span>학교 기출 스타일 분석</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  sectionsOpen.analysis && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted">
                <BarChart3 className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-xs font-medium text-foreground">
                  과거 기출 파일 업로드
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI가 출제 스타일을 분석합니다
                </p>
              </div>
              <div className="mt-2 rounded-lg bg-accent/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  분석된 스타일: <span className="font-medium text-primary">서울고 2024 1학기</span>
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Generation Options */}
          <Collapsible
            open={sectionsOpen.options}
            onOpenChange={(open) => setSectionsOpen((s) => ({ ...s, options: open }))}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4" />
                <span>출제 옵션</span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  sectionsOpen.options && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="flex flex-col gap-4">
                {/* Difficulty Slider */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground">난이도</Label>
                    <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
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
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>쉬움</span>
                    <span>어려움</span>
                  </div>
                </div>

                {/* Question Count Slider */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground">문제 수</Label>
                    <span className="rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
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
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>1문항</span>
                    <span>20문항</span>
                  </div>
                </div>

                {/* Question Types */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <Label className="mb-2 block text-xs font-medium text-foreground">
                    문제 유형 선택
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {questionTypes.map((type) => (
                      <label
                        key={type.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                          selectedTypes.includes(type.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-accent"
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

      <div className="border-t border-border p-4">
        <Button className="w-full" size="lg">
          <FileQuestion className="mr-2 size-4" />
          문제 생성하기
        </Button>
      </div>
    </aside>
  )
}
