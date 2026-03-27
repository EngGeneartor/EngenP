import { LeftSidebar } from "@/components/left-sidebar"
import { MainContent } from "@/components/main-content"
import { AIChatSidebar } from "@/components/ai-chat-sidebar"

export default function Dashboard() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <LeftSidebar />
      <MainContent />
      <AIChatSidebar />
    </div>
  )
}
