"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageCircle, X, Star, CheckCircle2, Zap, Settings } from "lucide-react"
import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { ProjectHistory } from "@/components/project-history"
import { AmbientBackground } from "@/components/ambient-background"
import { UpgradePrompt } from "@/components/upgrade-prompt"
import { SettingsModal } from "@/components/settings-modal"
import { supabase } from "@/lib/supabase"
import { useProject } from "@/lib/hooks/use-project"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import type { UploadedFile, StructuredPassage, GeneratedQuestion, SchoolDnaProfile } from "@/lib/types"

export type ProcessingStep = "idle" | "structurizing" | "generating" | "exporting" | "done"

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [historyCollapsed, setHistoryCollapsed] = useState(true)

  // Subscription plan
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free")
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined)

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Pipeline state
  const [structuredPassage, setStructuredPassage] = useState<StructuredPassage | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle")
  const [pipelineError, setPipelineError] = useState<string | null>(null)

  // DNA profile state
  const [dnaProfile, setDnaProfile] = useState<SchoolDnaProfile | null>(null)

  // DB project state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  // Track the current passage row being worked on (set after first save)
  const [currentPassageId, setCurrentPassageId] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = searchParams.get("demo") === "true"
  const upgraded = searchParams.get("upgraded") === "true"
  const wantsUpgrade = searchParams.get("upgrade") === "true"

  // ─── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login/")
      } else {
        setUser(user)
        // Fetch current subscription plan
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data && (data.status === "active" || data.status === "trialing")) {
              setUserPlan(data.plan as "free" | "pro")
            }
          })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/login/")
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, isDemo])

  // Mark plan as pro immediately when redirected back after Toss Payments checkout
  useEffect(() => {
    if (upgraded) {
      setUserPlan("pro")
    }
  }, [upgraded])

  // Open upgrade prompt when redirected from usage indicator
  useEffect(() => {
    if (wantsUpgrade && userPlan === "free") {
      setUpgradePromptOpen(true)
    }
  }, [wantsUpgrade, userPlan])

  const openUpgradePrompt = (reason?: string) => {
    setUpgradeReason(reason)
    setUpgradePromptOpen(true)
  }

  // ─── Project hook ─────────────────────────────────────────────────────────────

  const {
    projects,
    isLoading: projectsLoading,
    isSaving,
    savedAt,
    loadProjects,
    createProject,
    savePassage,
    saveQuestionSet,
    loadProject,
    deleteProject,
    renameProject,
  } = useProject(user?.id)

  // Load project list once user is known
  useEffect(() => {
    if (user?.id) {
      loadProjects()
    }
  }, [user?.id, loadProjects])

  // ─── Auto-save: after structurization ─────────────────────────────────────────

  const handleStructuredPassage = useCallback(
    async (passage: StructuredPassage) => {
      setStructuredPassage(passage)
      if (user?.id) {
        const passageId = await savePassage(
          passage,
          selectedFile?.name,
          selectedFile?.publicUrl,
          currentPassageId ?? undefined,
        )
        if (passageId) {
          setCurrentPassageId(passageId)
        }
      }
    },
    [user?.id, savePassage, selectedFile, currentPassageId],
  )

  // ─── Auto-save: after question generation ─────────────────────────────────────

  const handleGeneratedQuestions = useCallback(
    async (questions: GeneratedQuestion[]) => {
      setGeneratedQuestions(questions)
      if (user?.id && currentPassageId && questions.length > 0) {
        await saveQuestionSet(currentPassageId, questions, {
          types: questions.map((q) => q.type_id),
          count: questions.length,
        })
      }
    },
    [user?.id, currentPassageId, saveQuestionSet],
  )

  // ─── Load project from sidebar ────────────────────────────────────────────────

  const handleSelectProject = useCallback(
    async (passageId: string) => {
      setSelectedProjectId(passageId)
      if (!user?.id) return
      const loaded = await loadProject(passageId)
      if (loaded) {
        setCurrentPassageId(passageId)
        if (loaded.structuredPassage) {
          setStructuredPassage(loaded.structuredPassage)
        }
        if (loaded.generatedQuestions.length > 0) {
          setGeneratedQuestions(loaded.generatedQuestions)
          setProcessingStep("done")
        }
      }
    },
    [user?.id, loadProject],
  )

  // ─── Create new blank project ──────────────────────────────────────────────────

  const handleCreateProject = useCallback(async () => {
    if (!user?.id) return
    const newId = await createProject()
    if (newId) {
      setSelectedProjectId(newId)
      setCurrentPassageId(newId)
      setStructuredPassage(null)
      setGeneratedQuestions([])
      setProcessingStep("idle")
      setPipelineError(null)
      setUploadedFiles([])
      setSelectedFile(null)
    }
  }, [user?.id, createProject])

  // ─── File select: detach from current passage row ─────────────────────────────

  const handleFileSelect = useCallback((file: UploadedFile | null) => {
    setSelectedFile(file)
    // When user picks a new file, clear the current passage so a new DB row is created
    if (file) setCurrentPassageId(null)
  }, [])

  // ─── Loading screen ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <AmbientBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-3 border-purple-500/20 border-t-purple-500" />
          <p className="text-[13px] text-foreground/50">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user && !isDemo) return null

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <AmbientBackground />
      <ProjectHistory
        collapsed={historyCollapsed}
        onToggle={() => setHistoryCollapsed(!historyCollapsed)}
        projects={projects}
        isLoading={projectsLoading}
        selectedId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDeleteProject={deleteProject}
        onRenameProject={renameProject}
      />
      <div className="divider-v-gradient shrink-0" />
      <LeftSidebar
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        isDemo={isDemo}
        isProcessing={isProcessing}
        processingStep={processingStep}
        pipelineError={pipelineError}
        onStructuredPassage={handleStructuredPassage}
        onGeneratedQuestions={handleGeneratedQuestions}
        onIsProcessing={setIsProcessing}
        onProcessingStep={setProcessingStep}
        onPipelineError={setPipelineError}
        dnaProfile={dnaProfile}
        onDnaProfile={setDnaProfile}
        userId={user?.id}
      />
      <div className="divider-v-gradient shrink-0" />
      <MainContent
        selectedFile={selectedFile}
        uploadedFiles={uploadedFiles}
        structuredPassage={structuredPassage}
        generatedQuestions={generatedQuestions}
        isProcessing={isProcessing}
        processingStep={processingStep}
        isDemo={isDemo}
      />

      {/* 저장됨 indicator — shown during save and briefly after */}
      {(isSaving || savedAt) && !isDemo && (
        <div
          className={cn(
            "fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border bg-background/90 px-4 py-2 text-[12px] font-medium shadow-lg backdrop-blur-sm transition-all duration-300",
            isSaving
              ? "border-purple-500/20 text-purple-400"
              : "border-emerald-500/20 text-emerald-400",
          )}
        >
          {isSaving ? (
            <>
              <div className="size-3 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
              저장 중...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              저장됨
            </>
          )}
        </div>
      )}

      {chatOpen ? (
        <>
          <div className="divider-v-gradient shrink-0" />
          <div className="relative">
            <button
              onClick={() => setChatOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-foreground/50 transition-smooth hover:bg-muted/30 hover:text-foreground/60"
              title="채팅 닫기"
            >
              <X className="size-4" />
            </button>
            <AIChatSidebar
              userEmail={user?.email}
              context={{ passage: structuredPassage, questions: generatedQuestions }}
              onSignOut={async () => {
                await supabase.auth.signOut()
                router.push("/")
              }}
            />
          </div>
        </>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 text-white shadow-xl shadow-purple-500/25 transition-smooth hover:shadow-purple-500/40 hover:brightness-110 active:scale-95"
          title="Haean AI 열기"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {/* Bottom-left controls: Plan badge + Settings */}
      {!isDemo && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2">
          {userPlan === "pro" ? (
            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-3 py-1.5 shadow-lg shadow-purple-500/30">
              <Star className="size-3 text-white" strokeWidth={2.5} />
              <span className="text-[11px] font-bold text-white">Pro</span>
            </div>
          ) : (
            <button
              onClick={() => openUpgradePrompt()}
              className="flex items-center gap-1.5 rounded-xl border border-border/30 bg-background/60 px-3 py-1.5 text-foreground/50 shadow-sm backdrop-blur-sm transition-all hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400"
            >
              <Zap className="size-3" strokeWidth={2.5} />
              <span className="text-[11px] font-semibold">Free</span>
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex size-8 items-center justify-center rounded-xl border border-border/30 bg-background/60 text-foreground/50 shadow-sm backdrop-blur-sm transition-all hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400"
            title="설정"
          >
            <Settings className="size-3.5" />
          </button>
        </div>
      )}

      {/* Upgrade success notification */}
      {upgraded && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 shadow-xl shadow-purple-500/10 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Star className="size-4 text-purple-400" strokeWidth={2.5} />
            <p className="text-[13px] font-semibold text-purple-300">
              Pro 플랜으로 업그레이드되었습니다!
            </p>
          </div>
        </div>
      )}

      {/* Upgrade prompt modal */}
      <UpgradePrompt
        open={upgradePromptOpen}
        onClose={() => setUpgradePromptOpen(false)}
        reason={upgradeReason}
      />

      {/* Settings modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={user?.email}
        userId={user?.id}
        userPlan={userPlan}
        createdAt={user?.created_at}
        onSignOut={async () => {
          await supabase.auth.signOut()
          router.push("/")
        }}
      />
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <AmbientBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-3 border-purple-500/20 border-t-purple-500" />
          <p className="text-[13px] text-foreground/50">로딩 중...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
