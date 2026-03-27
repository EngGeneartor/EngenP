"use client"

import { useState } from "react"
import { Plus, Sparkles, Clock, FileText, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Project {
  id: string
  title: string
  passage: string
  questionsCount: number
  createdAt: Date
  types: string[]
}

const sampleProjects: Project[] = [
  {
    id: "1",
    title: "Cultural Intelligence",
    passage: "2024 수능특강 영어 - 지문 1",
    questionsCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    types: ["어법", "빈칸 추론", "어휘"],
  },
  {
    id: "2",
    title: "Sustainable Architecture",
    passage: "2024 수능특강 영어 - 지문 8",
    questionsCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    types: ["어법", "순서 배열", "문장 삽입"],
  },
  {
    id: "3",
    title: "Digital Minimalism",
    passage: "2024 EBS 수능완성 - 지문 3",
    questionsCount: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    types: ["빈칸 추론", "제목 추론"],
  },
  {
    id: "4",
    title: "Cognitive Bias in Decision",
    passage: "모의고사 2024년 6월 - 31번",
    questionsCount: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    types: ["어법", "어휘", "빈칸 추론", "순서 배열"],
  },
  {
    id: "5",
    title: "The Paradox of Choice",
    passage: "2024 수능특강 영어 - 지문 15",
    questionsCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    types: ["어휘", "글의 목적"],
  },
]

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

interface ProjectHistoryProps {
  collapsed: boolean
  onToggle: () => void
}

export function ProjectHistory({ collapsed, onToggle }: ProjectHistoryProps) {
  const [selectedId, setSelectedId] = useState("1")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (collapsed) {
    return (
      <aside className="relative z-10 flex h-full w-[52px] flex-col items-center sidebar-glass py-4">
        <button
          onClick={onToggle}
          className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 text-purple-400 transition-smooth hover:bg-purple-500/25"
          title="프로젝트 목록 열기"
        >
          <ChevronRight className="size-4" />
        </button>
        <div className="divider-gradient my-3 w-6" />
        <button
          className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition-smooth hover:bg-purple-500/20"
          title="새 프로젝트"
        >
          <Plus className="size-4" />
        </button>
        <div className="mt-3 flex flex-col gap-1.5">
          {sampleProjects.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl text-[11px] font-bold transition-smooth",
                selectedId === p.id
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-foreground/30 hover:bg-muted/30 hover:text-foreground/50"
              )}
              title={p.title}
            >
              <FileText className="size-3.5" />
            </button>
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="relative z-10 flex h-full w-[240px] flex-col sidebar-glass">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-purple-400/70" />
          <h3 className="text-[13px] font-bold text-foreground/80">프로젝트</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-smooth hover:bg-purple-500/10 hover:text-purple-400"
            title="새 프로젝트"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={onToggle}
            className="flex size-7 items-center justify-center rounded-lg text-foreground/40 transition-smooth hover:bg-muted/30 hover:text-foreground/60"
            title="접기"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>

      <div className="divider-gradient mx-3" />

      {/* New Project Button */}
      <div className="px-3 pt-3 pb-1">
        <button className="btn-shine flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/80 via-violet-600/80 to-indigo-600/80 px-3 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-purple-500/10 transition-smooth hover:shadow-purple-500/20 hover:brightness-110">
          <Plus className="size-3.5" />
          새 프로젝트
        </button>
      </div>

      {/* Today */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="mb-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">오늘</p>
          {sampleProjects.filter(p => Date.now() - p.createdAt.getTime() < 86400000).map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "group relative flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-smooth",
                selectedId === project.id
                  ? "bg-purple-500/15 border border-purple-500/20"
                  : "hover:bg-muted/25 border border-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[12px] font-semibold truncate pr-2",
                  selectedId === project.id ? "text-purple-300" : "text-foreground/70"
                )}>
                  {project.title}
                </span>
                {hoveredId === project.id && (
                  <MoreHorizontal className="size-3.5 shrink-0 text-foreground/30" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/45 truncate">{project.passage}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="pill border border-purple-500/15 bg-purple-500/8 text-purple-400/70 text-[9px] py-0 px-1.5">{project.questionsCount}문항</span>
                <span className="text-[9px] text-muted-foreground/35">{formatRelativeTime(project.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-2">
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">이전</p>
          {sampleProjects.filter(p => Date.now() - p.createdAt.getTime() >= 86400000).map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedId(project.id)}
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                "group relative flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-smooth",
                selectedId === project.id
                  ? "bg-purple-500/15 border border-purple-500/20"
                  : "hover:bg-muted/25 border border-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[12px] font-semibold truncate pr-2",
                  selectedId === project.id ? "text-purple-300" : "text-foreground/70"
                )}>
                  {project.title}
                </span>
                {hoveredId === project.id && (
                  <MoreHorizontal className="size-3.5 shrink-0 text-foreground/30" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/45 truncate">{project.passage}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="pill border border-purple-500/15 bg-purple-500/8 text-purple-400/70 text-[9px] py-0 px-1.5">{project.questionsCount}문항</span>
                {project.types.slice(0, 2).map(t => (
                  <span key={t} className="pill border border-border/15 bg-muted/15 text-muted-foreground/40 text-[9px] py-0 px-1.5">{t}</span>
                ))}
                <span className="text-[9px] text-muted-foreground/35">{formatRelativeTime(project.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
