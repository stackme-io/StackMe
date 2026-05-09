import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface UploadZoneProps {
  loading: boolean
  progress: string | null
  onFile: (file: File) => void
}

export function UploadZone({ loading, progress, onFile }: UploadZoneProps) {
  const { t } = useTranslation()
  const [tooltipVisible, setTooltip] = useState(false)
  const [dragging, setDragging]      = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const badgeRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!tooltipVisible) return
    const handler = (e: MouseEvent) => {
      if (
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node) &&
        badgeRef.current && !badgeRef.current.contains(e.target as Node)
      ) {
        setTooltip(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tooltipVisible])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!loading) setDragging(true)
  }, [loading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (loading) return
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [loading, onFile])

  const dropzoneText = loading
    ? progress ?? t('analyze.analyzing')
    : dragging
    ? t('analyze.dropzoneRelease')
    : t('analyze.dropzone')

  return (
    <div className="relative">
      <label
        htmlFor="analyze-file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors block ${
          loading
            ? 'border-primary/30 bg-muted/10'
            : dragging
            ? 'border-primary/60 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-muted/20'
        }`}
      >
        <input
          id="analyze-file-input"
          type="file"
          accept=".csv,.json"
          className="hidden"
          disabled={loading}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
        <p className="text-sm text-foreground">{dropzoneText}</p>
        {loading && (
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 rounded-full animate-pulse w-full" />
          </div>
        )}
        <div className="h-2" />
      </label>

      {/* Privacy badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2" ref={badgeRef}>
        <button
          type="button"
          onClick={() => setTooltip(v => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/60 bg-background hover:border-border transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-muted-foreground">
            <path d="M5 1L1.5 2.5v3C1.5 7.5 3 9 5 9.5 7 9 8.5 7.5 8.5 5.5v-3L5 1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px] text-muted-foreground">{t('analyze.privacyBadge')}</span>
        </button>

        {tooltipVisible && (
          <div
            ref={tooltipRef}
            onClick={() => setTooltip(false)}
            className="absolute top-8 left-1/2 -translate-x-1/2 w-64 px-3 py-2.5 rounded-lg border border-border bg-background shadow-lg z-20 text-xs text-muted-foreground cursor-pointer"
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-l border-t border-border bg-background" />
            <p className="font-medium text-foreground mb-1">{t('analyze.privacyTitle')}</p>
            <p>{t('analyze.privacyBody')}</p>
          </div>
        )}
      </div>
    </div>
  )
}