"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { AmbientBackground } from "@/components/ambient-background"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { UploadedFile } from "@/lib/types"

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  const router = useRouter()

  useEffect(() => {
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
  }, [router])

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

  if (!user) return null

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
      <div className="divider-v-gradient shrink-0" />
      <AIChatSidebar />
    </div>
  )
}
