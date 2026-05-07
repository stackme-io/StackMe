import { AnalyzeSection } from './AnalyzeSection'

export default function AnalyzeMePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">

      <main className="flex-1 overflow-y-auto px-6 pt-5">
        <AnalyzeSection />
      </main>

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