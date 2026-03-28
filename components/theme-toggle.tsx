"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          className
        )}
      />
    )
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group flex size-9 items-center justify-center rounded-xl transition-all duration-200",
        "text-foreground/50 hover:bg-muted/60 hover:text-foreground/80",
        className
      )}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="size-4 transition-transform duration-200 group-hover:rotate-12" />
      ) : (
        <Moon className="size-4 transition-transform duration-200 group-hover:-rotate-12" />
      )}
    </button>
  )
}
