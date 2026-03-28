import Link from "next/link"
import { Home, SearchX } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 shadow-xl shadow-purple-500/20">
          <SearchX className="size-9 text-white" strokeWidth={2} />
        </div>

        <h1 className="mt-8 text-6xl font-extrabold tracking-tight text-gradient-bright">404</h1>
        <p className="mt-4 text-lg font-semibold text-foreground/70">
          페이지를 찾을 수 없습니다
        </p>
        <p className="mt-2 max-w-sm text-[13px] text-foreground/50">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        <Link
          href="/"
          className="mt-8 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-purple-500/25 transition-smooth hover:shadow-purple-500/35 hover:brightness-110 active:scale-[0.98]"
        >
          <Home className="size-4" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
