import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"

export default function Dashboard() {
  return (
    <div className="ambient-bg noise-overlay flex h-screen w-full overflow-hidden bg-background">
      <LeftSidebar />
      <div className="divider-v-gradient shrink-0" />
      <MainContent />
      <div className="divider-v-gradient shrink-0" />
      <AIChatSidebar />
    </div>
  )
}
