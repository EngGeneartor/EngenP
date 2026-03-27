"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "안녕하세요! 문제 생성을 도와드리는 AI 어시스턴트입니다. 생성된 문제에 대해 수정이 필요하시면 말씀해주세요.",
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 2,
    role: "user",
    content: "1번 문제의 어법 포인트를 '관계대명사'에서 '도치'로 바꿔줘",
    timestamp: new Date(Date.now() - 45000),
  },
  {
    id: 3,
    role: "assistant",
    content:
      "1번 문제의 어법 포인트를 '도치'로 변경했습니다. 문장 구조를 분석하여 도치 구문이 자연스럽게 포함되도록 수정했어요. 확인해주세요!",
    timestamp: new Date(Date.now() - 30000),
  },
]

const quickPrompts = [
  "전체 난이도를 조금 올려줘",
  "빈칸 추론 문제 1개 추가",
  "3번 선택지 더 어렵게",
  "문법 포인트 설명 추가",
]

export function AIChatSidebar() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        role: "assistant",
        content: `요청하신 "${input}"에 대해 처리했습니다. 변경 사항이 반영되었어요. 추가 수정이 필요하시면 말씀해주세요!`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border/50 bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 glow-purple">
          <Bot className="size-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">AI Co-pilot</h3>
          <p className="text-[11px] text-muted-foreground">Claude 기반 문제 수정 어시스턴트</p>
        </div>
        <div className="flex size-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
      </div>

      {/* Quick Prompts */}
      <div className="border-b border-border/50 p-4">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lightbulb className="size-3 text-amber-400" />
          <span>빠른 명령어</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-[11px] text-foreground/70 transition-smooth hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                    "text-xs",
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                      : "bg-secondary text-secondary-foreground"
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
                  "max-w-[82%] rounded-xl px-3.5 py-2.5 text-[13px]",
                  message.role === "assistant"
                    ? "bg-muted/50 text-foreground/85"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                )}
              >
                <p className="leading-relaxed">{message.content}</p>
                <p
                  className={cn(
                    "mt-1.5 text-[10px]",
                    message.role === "assistant"
                      ? "text-muted-foreground"
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
          {isLoading && (
            <div className="flex gap-2.5">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Sparkles className="size-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 rounded-xl bg-muted/50 px-4 py-3">
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
                <div className="size-1.5 animate-bounce rounded-full bg-purple-400" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문제 수정 요청을 입력하세요..."
            className="min-h-[76px] resize-none rounded-xl border-border/50 bg-secondary/40 pr-12 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple-500/40 focus:ring-purple-500/20"
          />
          <Button
            size="icon"
            className="absolute bottom-2.5 right-2.5 size-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 transition-smooth hover:from-purple-500 hover:to-indigo-500 disabled:opacity-30"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </aside>
  )
}
