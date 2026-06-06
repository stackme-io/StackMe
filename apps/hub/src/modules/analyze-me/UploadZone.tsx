import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface UploadZoneProps {
  loading: boolean
  progress: string | null
  fileName: string | null
  onFile: (file: File) => void
}

export function UploadZone({ loading, progress, fileName, onFile }: UploadZoneProps) {
  const { t } = useTranslation('analyze-me')
  const [dragging, setDragging] = useState(false)

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

  const mainText = loading
    ? progress ?? t('analyzing')
    : dragging
    ? t('dropzoneRelease')
    : fileName
    ? t('dropzoneReplace')
    : t('dropzone')

  return (
    <div className="relative">
      <label
        htmlFor="analyze-file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-[88px] border-2 border-dashed rounded-xl px-6 py-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors block ${
          loading
            ? 'border-primary/30 bg-muted/10'
            : dragging
            ? 'border-primary/60 bg-primary/5'
            : fileName
            ? 'border-border/50 hover:border-primary/30 hover:bg-muted/10'
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

        {fileName && !loading && (
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground flex-shrink-0">
              <path d="M2 1.5h5.5L10 4v6.5H2V1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
              <path d="M7 1.5V4.5h3" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-foreground font-medium">{fileName}</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{mainText}</p>

        {loading && (
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 rounded-full animate-pulse w-full" />
          </div>
        )}
      </label>

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="relative group">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/60 bg-background hover:border-border transition-colors cursor-default">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-muted-foreground flex-shrink-0">
              <rect x="2" y="5" width="7" height="5" rx="0.8" stroke="currentColor" strokeWidth="1"/>
              <path d="M3.5 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span className="text-xs text-muted-foreground">{t('privacyBadge')}</span>
          </div>
          <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-72 px-3 py-2.5 rounded-lg border border-border bg-background shadow-lg z-20 text-xs text-muted-foreground hidden group-hover:block pointer-events-none">
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-r border-b border-border bg-background" />
            <p className="font-medium text-foreground mb-1">{t('privacyTitle')}</p>
            <p>{t('privacyBody')}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/70 text-center max-w-xs leading-relaxed">
          {t('privacyDevTools')}{' '}
          <a
            href="/security.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400/70 hover:text-teal-400 underline underline-offset-2 transition-colors"
          >
            {t('privacyLearnMore')}
          </a>
        </p>
      </div>
    </div>
  )
}