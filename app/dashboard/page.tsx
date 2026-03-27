import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"
import { AmbientBackground } from "@/components/ambient-background"

export default function Dashboard() {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      <AmbientBackground />
      <LeftSidebar />
      <div className="divider-v-gradient shrink-0" />
      <MainContent />
      <div className="divider-v-gradient shrink-0" />
      <AIChatSidebar />
    </div>
  )
}
