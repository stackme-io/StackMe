import { useCallback, useState } from 'react'

type AnalyzeState = 'idle' | 'dragging' | 'loading'

export default function AnalyzeMePage() {
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle')
  const [fileName, setFileName]         = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setAnalyzeState('dragging')
  }, [])

  const handleDragLeave = useCallback(() => {
    setAnalyzeState('idle')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    setFileName(file.name)
    setAnalyzeState('idle')
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setAnalyzeState('idle')
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Main area ── */}
      <main className="flex-1 overflow-y-auto px-6 pt-5">

        {/* Upload zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer mb-6 ${
            analyzeState === 'dragging'
              ? 'border-primary/60 bg-primary/5'
              : 'border-border hover:border-primary/30 hover:bg-muted/20'
          }`}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={handleFileInput}
          />

          {/* Icon */}
          <div className="w-10 h-10 rounded-lg border border-border bg-muted/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-muted-foreground">
              <path d="M9 2v9m0-9L6 5m3-3l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>

          {fileName ? (
            <div className="text-center">
              <p className="text-sm text-foreground font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">click to change file</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-foreground">drop your CSV or JSON here</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
          )}

          {/* Privacy badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-muted-foreground">
                <path d="M5 1L1.5 2.5v3C1.5 7.5 3 9 5 9.5 7 9 8.5 7.5 8.5 5.5v-3L5 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              <span className="text-[9px] text-muted-foreground">stays in your browser</span>
          </div>
        </div>

        {/* Results area — empty state */}
        <div className="border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center gap-2 min-h-[200px]">
          <p className="text-xs text-muted-foreground/40">
            {fileName ? 'analysis results will appear here' : 'upload a file to start analysis'}
          </p>
        </div>

      </main>

      {/* ── Footer ── */}
      <div className="h-8 border-t border-border/50 flex items-center px-6 gap-5 flex-shrink-0">
        {['no setup', 'runs locally', 'no data collected', 'open source'].map(item => (
          <span key={item} className="text-[10px] text-muted-foreground/60">
            <span className="mr-1 text-muted-foreground/40">//</span>{item}
          </span>
        ))}
      </div>

    </div>
  )
}