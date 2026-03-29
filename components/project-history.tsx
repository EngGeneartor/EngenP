"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Clock, FileText, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Pencil, Check, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ProjectSummary } from "@/lib/hooks/use-project"

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
  projects: ProjectSummary[]
  isLoading: boolean
  selectedId: string | null
  onSelectProject: (id: string) => void
  onCreateProject: () => void
  onDeleteProject: (id: string) => void
  onRenameProject: (id: string, title: string) => void
  /** When true, renders full-width list without collapse toggle (mobile layout) */
  isMobile?: boolean
}

export function ProjectHistory({
  collapsed,
  onToggle,
  projects,
  isLoading,
  selectedId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  isMobile,
}: ProjectHistoryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpenId])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const startRename = (project: ProjectSummary) => {
    setMenuOpenId(null)
    setRenamingId(project.id)
    setRenameValue(project.title ?? "")
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameProject(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue("")
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename()
    if (e.key === "Escape") cancelRename()
  }

  const startDelete = (id: string) => {
    setMenuOpenId(null)
    setConfirmDeleteId(id)
  }

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteProject(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  const todayProjects = projects.filter(
    (p) => Date.now() - p.createdAt.getTime() < 86400000
  )
  const olderProjects = projects.filter(
    (p) => Date.now() - p.createdAt.getTime() >= 86400000
  )

  if (collapsed && !isMobile) {
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
          onClick={onCreateProject}
          className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition-smooth hover:bg-purple-500/20"
          title="새 프로젝트"
        >
          <Plus className="size-4" />
        </button>
        <div className="mt-3 flex flex-col gap-1.5">
          {isLoading ? (
            <div className="flex size-9 items-center justify-center">
              <Loader2 className="size-3.5 animate-spin text-purple-400/50" />
            </div>
          ) : (
            projects.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-xl text-[11px] font-bold transition-smooth",
                  selectedId === p.id
                    ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                    : "text-foreground/50 hover:bg-muted/30 hover:text-foreground/50"
                )}
                title={p.title ?? "프로젝트"}
              >
                <FileText className="size-3.5" />
              </button>
            ))
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className={cn("relative z-10 flex h-full flex-col", isMobile ? "w-full" : "w-[240px] sidebar-glass")}>
      {/* Header */}
      {!isMobile && (
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-purple-400/70" />
          <h3 className="text-[13px] font-bold text-foreground/80">프로젝트</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateProject}
            className="flex size-7 items-center justify-center rounded-lg text-foreground/60 transition-smooth hover:bg-purple-500/10 hover:text-purple-400"
            title="새 프로젝트"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={onToggle}
            className="flex size-7 items-center justify-center rounded-lg text-foreground/60 transition-smooth hover:bg-muted/30 hover:text-foreground/60"
            title="접기"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
      )}

      {!isMobile && <div className="divider-gradient mx-3" />}

      {/* New Project Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onCreateProject}
          className="btn-shine flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/80 via-violet-600/80 to-indigo-600/80 px-3 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-purple-500/10 transition-smooth hover:shadow-purple-500/20 hover:brightness-110"
        >
          <Plus className="size-3.5" />
          새 프로젝트
        </button>
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-inherit">
          <div className="mx-4 rounded-2xl border border-red-500/20 bg-background/95 p-4 shadow-xl">
            <p className="text-[13px] font-semibold text-foreground/80">프로젝트를 삭제할까요?</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">이 작업은 되돌릴 수 없습니다.</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-border/30 bg-muted/20 py-2 text-[12px] font-medium text-foreground/60 transition-smooth hover:bg-muted/40"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500/80 py-2 text-[12px] font-semibold text-white transition-smooth hover:bg-red-500"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-3 py-2">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-5 animate-spin text-purple-400/50" />
            <p className="text-[11px] text-muted-foreground/60">불러오는 중...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="size-8 text-muted-foreground/60" />
            <p className="text-[12px] font-medium text-muted-foreground/60">프로젝트가 없습니다</p>
            <p className="text-[11px] text-muted-foreground/55">새 프로젝트를 만들어보세요</p>
          </div>
        ) : (
          <>
            {todayProjects.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">오늘</p>
                {todayProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isSelected={selectedId === project.id}
                    isHovered={hoveredId === project.id}
                    isMenuOpen={menuOpenId === project.id}
                    isRenaming={renamingId === project.id}
                    renameValue={renameValue}
                    renameInputRef={renamingId === project.id ? renameInputRef : undefined}
                    menuRef={menuOpenId === project.id ? menuRef : undefined}
                    onSelect={() => onSelectProject(project.id)}
                    onHover={() => setHoveredId(project.id)}
                    onLeave={() => setHoveredId(null)}
                    onMenuToggle={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                    onStartRename={() => startRename(project)}
                    onStartDelete={() => startDelete(project.id)}
                    onRenameChange={setRenameValue}
                    onRenameKeyDown={handleRenameKeyDown}
                    onRenameCommit={commitRename}
                    onRenameCancel={cancelRename}
                  />
                ))}
              </div>
            )}

            {olderProjects.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">이전</p>
                {olderProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isSelected={selectedId === project.id}
                    isHovered={hoveredId === project.id}
                    isMenuOpen={menuOpenId === project.id}
                    isRenaming={renamingId === project.id}
                    renameValue={renameValue}
                    renameInputRef={renamingId === project.id ? renameInputRef : undefined}
                    menuRef={menuOpenId === project.id ? menuRef : undefined}
                    onSelect={() => onSelectProject(project.id)}
                    onHover={() => setHoveredId(project.id)}
                    onLeave={() => setHoveredId(null)}
                    onMenuToggle={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                    onStartRename={() => startRename(project)}
                    onStartDelete={() => startDelete(project.id)}
                    onRenameChange={setRenameValue}
                    onRenameKeyDown={handleRenameKeyDown}
                    onRenameCommit={commitRename}
                    onRenameCancel={cancelRename}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </aside>
  )
}

// ─── ProjectItem sub-component ─────────────────────────────────────────────

interface ProjectItemProps {
  project: ProjectSummary
  isSelected: boolean
  isHovered: boolean
  isMenuOpen: boolean
  isRenaming: boolean
  renameValue: string
  renameInputRef?: React.RefObject<HTMLInputElement | null>
  menuRef?: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
  onMenuToggle: () => void
  onStartRename: () => void
  onStartDelete: () => void
  onRenameChange: (v: string) => void
  onRenameKeyDown: (e: React.KeyboardEvent) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
}

function ProjectItem({
  project,
  isSelected,
  isHovered,
  isMenuOpen,
  isRenaming,
  renameValue,
  renameInputRef,
  menuRef,
  onSelect,
  onHover,
  onLeave,
  onMenuToggle,
  onStartRename,
  onStartDelete,
  onRenameChange,
  onRenameKeyDown,
  onRenameCommit,
  onRenameCancel,
}: ProjectItemProps) {
  return (
    <div className="relative">
      <button
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className={cn(
          "group relative flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-smooth",
          isSelected
            ? "bg-purple-500/15 border border-purple-500/20"
            : "hover:bg-muted/25 border border-transparent"
        )}
      >
        <div className="flex items-center justify-between">
          {isRenaming ? (
            <div
              className="flex flex-1 items-center gap-1 pr-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={onRenameKeyDown}
                className="flex-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[12px] font-semibold text-purple-700 outline-none dark:text-purple-300"
              />
              <button
                onClick={onRenameCommit}
                className="flex size-5 shrink-0 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="size-3" />
              </button>
              <button
                onClick={onRenameCancel}
                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:bg-muted/30"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <>
              <span className={cn(
                "text-[12px] font-semibold truncate pr-2",
                isSelected ? "text-purple-700 dark:text-purple-300" : "text-foreground/70"
              )}>
                {project.title ?? "제목 없음"}
              </span>
              {isHovered && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
                  className="flex size-5 shrink-0 items-center justify-center rounded text-foreground/50 hover:text-foreground/60"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
              )}
            </>
          )}
        </div>
        {!isRenaming && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground/60 truncate">
                {project.source ?? "지문"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {project.questionsCount > 0 && (
                <span className="pill border border-purple-500/15 bg-purple-500/8 text-purple-400/70 text-[9px] py-0 px-1.5">
                  {project.questionsCount}문항
                </span>
              )}
              {project.types.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="pill border border-border/15 bg-muted/15 text-muted-foreground/60 text-[9px] py-0 px-1.5"
                >
                  {t}
                </span>
              ))}
              <span className="text-[9px] text-muted-foreground/55 ml-auto">
                {formatRelativeTime(project.createdAt)}
              </span>
            </div>
          </>
        )}
      </button>

      {/* Context menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-8 z-50 min-w-[120px] rounded-xl border border-border/20 bg-background/95 py-1 shadow-xl backdrop-blur-sm"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onStartRename() }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground/70 transition-smooth hover:bg-muted/30"
          >
            <Pencil className="size-3.5 text-muted-foreground/50" />
            이름 변경
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStartDelete() }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-400 transition-smooth hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  )
}
