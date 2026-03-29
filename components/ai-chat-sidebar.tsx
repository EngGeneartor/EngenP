"use client"

import { useState, useRef, useEffect } from "react"
import { Send, User, Sparkles, Lightbulb, MessageCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useChat } from "@/hooks/use-chat"
import type { ChatContext, OnQuestionsUpdate } from "@/hooks/use-chat"
import type { StructuredPassage, GeneratedQuestion } from "@/lib/types"

const quickPrompts = [
  { text: "난이도 올려줘", icon: "↑" },
  { text: "문제 추가해줘", icon: "+" },
  { text: "해설 자세히", icon: "★" },
  { text: "다른 유형으로", icon: "↻" },
]

interface AIChatSidebarProps {
  userEmail?: string | null
  onSignOut?: () => void
  context?: {
    passage?: StructuredPassage | null
    questions?: GeneratedQuestion[] | null
  }
  onQuestionsUpdate?: OnQuestionsUpdate
}

export function AIChatSidebar({ userEmail, onSignOut, context, onQuestionsUpdate }: AIChatSidebarProps = {}) {
  const chatContext: ChatContext = {
    passage: context?.passage,
    questions: context?.questions,
  }

  const { messages, isLoading, error, sendMessage, clearMessages } = useChat(chatContext, onQuestionsUpdate)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    // ScrollArea renders a viewport div we can target
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput("")
  }

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return
    sendMessage(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="relative z-10 flex h-full w-full md:w-[310px] flex-col sidebar-glass">
      {/* User Info */}
      {userEmail && (
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-muted/20 px-3 py-2">
            <User className="size-3.5 shrink-0 text-purple-400" />
            <span className="text-[11px] font-medium text-foreground/70 truncate">{userEmail}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 glow-md">
          <MessageCircle className="size-[18px] text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-extrabold tracking-tight text-gradient-bright">Haean AI</h3>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground/60">문제 생성 &amp; 수정 어시스턴트</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearMessages}
            title="대화 초기화"
            className="rounded-lg p-1.5 text-foreground/50 transition-smooth hover:bg-muted/30 hover:text-foreground/70"
          >
            <Trash2 className="size-3.5" />
          </button>
          <div className="relative">
            <div className="size-2.5 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 size-2.5 rounded-full bg-emerald-400 animate-pulse-ring" />
          </div>
        </div>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Quick Prompts */}
      <div className="px-4 py-4">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
          <Lightbulb className="size-3 text-amber-400/70" />
          <span>빠른 명령어</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPrompt(prompt.text)}
              disabled={isLoading}
              className="group flex items-center gap-1.5 rounded-xl border border-border/30 bg-muted/15 px-2.5 py-2 text-[11px] font-medium text-foreground/65 transition-smooth hover:border-purple-500/25 hover:bg-purple-500/[0.06] hover:text-purple-700 dark:hover:text-purple-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex size-5 items-center justify-center rounded-md bg-muted/30 text-[10px] font-bold text-muted-foreground/60 transition-smooth group-hover:bg-purple-500/15 group-hover:text-purple-400">
                {prompt.icon}
              </span>
              {prompt.text}
            </button>
          ))}
        </div>
      </div>

      <div className="divider-gradient mx-4" />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-2.5",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback
                  className={cn(
                    "text-xs rounded-xl",
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                      : "bg-secondary/60 text-secondary-foreground/70"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Sparkles className="size-3" />
                  ) : (
                    <User className="size-3" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12.5px]",
                  message.role === "assistant"
                    ? "rounded-tl-lg bg-muted/30 text-foreground/75"
                    : "rounded-tr-lg bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white shadow-lg shadow-purple-500/10"
                )}
              >
                <p className="leading-[1.7] whitespace-pre-wrap">{message.content}</p>
                <p
                  className={cn(
                    "mt-1.5 text-[10px]",
                    message.role === "assistant"
                      ? "text-muted-foreground/60"
                      : "text-white/50"
                  )}
                >
                  {message.timestamp.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator: show only when loading and the last message is NOT yet a partial assistant reply */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2.5">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Sparkles className="size-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-lg bg-muted/30 px-4 py-3">
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400/60 [animation-delay:-0.3s]" />
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400/60 [animation-delay:-0.15s]" />
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400/60" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="divider-gradient mx-4" />
      <div className="px-4 pb-5 pt-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문제 수정 요청을 입력하세요..."
            className="min-h-[72px] resize-none rounded-2xl border-border/30 bg-muted/20 pr-12 text-[13px] text-foreground/80 placeholder:text-muted-foreground/60 transition-smooth focus:border-purple-500/30 focus:bg-muted/30 focus:ring-1 focus:ring-purple-500/15"
          />
          <Button
            size="icon"
            className="absolute bottom-2.5 right-2.5 size-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 transition-smooth hover:brightness-110 disabled:opacity-20 disabled:shadow-none"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
          Enter 전송 · Shift+Enter 줄바꿈
        </p>
      </div>
    </aside>
  )
}
