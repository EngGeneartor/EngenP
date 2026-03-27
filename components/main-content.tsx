"use client"

import { useState, useEffect } from "react"
import { FileText, Image as ImageIcon, Eye, Upload, Sparkles, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { UploadedFile } from "@/lib/types"

interface MainContentProps {
  selectedFile: UploadedFile | null
  uploadedFiles: UploadedFile[]
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="size-5 text-purple-400" />
  return <FileText className="size-5 text-purple-400" />
}

function getFileExtension(name: string) {
  return name.split('.').pop()?.toUpperCase() || ''
}

function PDFViewer({ url }: { url: string }) {
  return (
    <div className="h-full w-full">
      <iframe
        src={`${url}#toolbar=1&navpanes=0&view=FitH`}
        className="h-full w-full rounded-xl border-0"
        title="PDF Viewer"
      />
    </div>
  )
}

function ImageViewer({ url, name }: { url: string; name: string }) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-b border-border/20 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-muted/30"
          onClick={() => setZoom(z => Math.max(25, z - 25))}
        >
          <ZoomOut className="size-4" />
        </Button>
        <span className="min-w-[50px] text-center text-[12px] font-medium text-foreground/50">{zoom}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-muted/30"
          onClick={() => setZoom(z => Math.min(300, z + 25))}
        >
          <ZoomIn className="size-4" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border/30" />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-foreground/50 hover:text-foreground/80 hover:bg-muted/30"
          onClick={() => setRotation(r => (r + 90) % 360)}
        >
          <RotateCw className="size-4" />
        </Button>
      </div>
      {/* Image */}
      <ScrollArea className="flex-1">
        <div className="flex min-h-full items-center justify-center p-8">
          <img
            src={url}
            alt={name}
            className="max-w-full transition-all duration-300"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      </ScrollArea>
    </div>
  )
}

function TextViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false) })
      .catch(() => { setContent("파일을 불러올 수 없습니다."); setLoading(false) })
  }, [url])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-500" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <pre className="whitespace-pre-wrap p-6 text-[13px] leading-[1.8] text-foreground/70 font-mono">
        {content}
      </pre>
    </ScrollArea>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
        <Upload className="size-9 text-purple-400/40" />
      </div>
      <div>
        <h3 className="text-[17px] font-bold text-foreground/70">지문을 업로드해주세요</h3>
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-foreground/40">
          좌측에서 PDF, JPG, PNG, TXT 파일을 업로드하면<br />
          여기에서 내용을 확인할 수 있습니다.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {["PDF", "JPG", "PNG", "TXT"].map(ext => (
          <span key={ext} className="pill border border-border/30 bg-muted/20 text-muted-foreground/50">{ext}</span>
        ))}
      </div>
    </div>
  )
}

export function MainContent({ selectedFile, uploadedFiles }: MainContentProps) {
  const [activeTab, setActiveTab] = useState("viewer")

  const handleDownload = () => {
    if (selectedFile?.publicUrl) {
      window.open(selectedFile.publicUrl, '_blank')
    }
  }

  return (
    <main className="relative z-10 flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-7 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15">
            {selectedFile ? <FileIcon type={selectedFile.type} /> : <Eye className="size-5 text-purple-400/60" />}
          </div>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-foreground/90">
              {selectedFile ? selectedFile.name : "타겟 지문"}
            </h2>
            <p className="text-[12px] font-medium text-muted-foreground/60">
              {selectedFile
                ? `${getFileExtension(selectedFile.name)} · ${(selectedFile.size / 1024).toFixed(1)}KB`
                : "파일을 선택하면 여기에 표시됩니다"
              }
            </p>
          </div>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2">
            <span className="pill border border-purple-500/20 bg-purple-500/8 text-purple-400">
              {getFileExtension(selectedFile.name)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-muted/30"
              onClick={handleDownload}
            >
              <Download className="size-4" />
            </Button>
          </div>
        )}
      </header>

      <div className="divider-gradient mx-6" />

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {!selectedFile ? (
          <div className="glass-card h-full rounded-2xl">
            <EmptyState />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            <TabsList className="w-fit rounded-2xl bg-muted/30 p-1 backdrop-blur-sm">
              <TabsTrigger value="viewer" className="gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-smooth data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-300">
                <Eye className="size-4" />
                파일 보기
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-2 rounded-xl px-5 py-2 text-[13px] font-semibold transition-smooth data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-300">
                <Sparkles className="size-4" />
                변형 문제
              </TabsTrigger>
            </TabsList>

            <TabsContent value="viewer" className="mt-5 flex-1 overflow-hidden">
              <div className="glass-card h-full overflow-hidden rounded-2xl">
                {selectedFile.type === "application/pdf" && selectedFile.publicUrl && (
                  <PDFViewer url={selectedFile.publicUrl} />
                )}
                {selectedFile.type.startsWith("image/") && selectedFile.publicUrl && (
                  <ImageViewer url={selectedFile.publicUrl} name={selectedFile.name} />
                )}
                {selectedFile.type === "text/plain" && selectedFile.publicUrl && (
                  <TextViewer url={selectedFile.publicUrl} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="questions" className="mt-5 flex-1 overflow-hidden">
              <div className="glass-card flex h-full items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                    <Sparkles className="size-7 text-purple-400/50" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-foreground/65">아직 생성된 문제가 없습니다</h3>
                  <p className="mt-2 text-[13px] text-foreground/40">
                    좌측에서 옵션을 설정하고 &quot;문제 생성하기&quot;를 클릭하세요
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Footer */}
      <div className="divider-gradient mx-6" />
      <footer className="px-7 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="font-medium text-foreground/50">
              {uploadedFiles.length > 0 ? `${uploadedFiles.length}개 파일 업로드됨` : "파일 없음"}
            </span>
          </div>
          <Button
            disabled={uploadedFiles.length === 0}
            className={cn(
              "btn-shine rounded-2xl px-7 py-5 text-[13px] font-bold text-white shadow-xl transition-smooth active:scale-[0.98]",
              uploadedFiles.length > 0
                ? "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 shadow-purple-500/15 hover:shadow-purple-500/25 hover:brightness-110"
                : "bg-muted/30 text-foreground/30 shadow-none cursor-not-allowed"
            )}
            size="lg"
          >
            <Download className="mr-2 size-4" />
            Word(.docx) 추출
          </Button>
        </div>
      </footer>
    </main>
  )
}
