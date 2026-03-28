"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 shadow-xl shadow-red-500/20">
          <AlertTriangle className="size-9 text-white" strokeWidth={2} />
        </div>

        <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-foreground">
          오류가 발생했습니다
        </h1>
        <p className="mt-4 max-w-sm text-[13px] text-foreground/50">
          예기치 않은 오류가 발생했습니다. 다시 시도해주세요.
        </p>

        <button
          onClick={reset}
          className="mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-purple-500/25 transition-smooth hover:shadow-purple-500/35 hover:brightness-110 active:scale-[0.98]"
        >
          <RotateCcw className="size-4" />
          다시 시도
        </button>
      </div>
    </div>
  )
}
