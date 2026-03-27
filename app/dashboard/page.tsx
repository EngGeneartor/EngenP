"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MessageCircle, X } from "lucide-react"
import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { AmbientBackground } from "@/components/ambient-background"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { UploadedFile } from "@/lib/types"

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = searchParams.get("demo") === "true"

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
      <LeftSidebar
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
      />
      <div className="divider-v-gradient shrink-0" />
      <MainContent selectedFile={selectedFile} uploadedFiles={uploadedFiles} />
      {chatOpen ? (
        <>
          <div className="divider-v-gradient shrink-0" />
          <div className="relative">
            <button
              onClick={() => setChatOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-foreground/30 transition-smooth hover:bg-muted/30 hover:text-foreground/60"
              title="채팅 닫기"
            >
              <X className="size-4" />
            </button>
            <AIChatSidebar
              userEmail={user?.email}
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
          title="Abyss AI 열기"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
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
