import { useState } from 'react'
import { AnalyzeSection } from './AnalyzeSection'
import { ModuleTabs } from '../../shared/ModuleTabs'

const TABS = [
  { id: 'work',  label: 'Work'  },
  { id: 'about', label: 'About' },
  { id: 'stack', label: 'Stack' },
]

export default function AnalyzeMePage() {
  const [activeTab, setActiveTab] = useState('work')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto px-6 pt-5">
        <ModuleTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'work' && <AnalyzeSection />}

        {activeTab === 'about' && (
          <div className="max-w-xl">
            <h2 className="text-sm font-medium text-foreground mb-1">AnalyzeMe</h2>
            <p className="text-xs text-muted-foreground mb-4">v0.1.0 · MIT License</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Local-first anomaly detection for real datasets. Upload a CSV or JSON file —
              the file never leaves your browser. Analysis runs entirely in DuckDB-Wasm.
            </p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-2">What's next</p>
            <div className="flex flex-col gap-1.5 mb-6">
              {[
                'Export anomaly report as CSV',
                'Select key columns for duplicate detection',
                'Z-score outlier detection',
                'Excel and Parquet support',
              ].map(f => (
                <div key={f} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">{f}</span>
                  <button className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors">
                    + vote
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stack' && (
          <div className="max-w-xl">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-3">Technologies</p>
            <div className="flex flex-col gap-1.5 mb-6">
              {[
                { name: 'DuckDB-Wasm', license: 'MIT', desc: 'In-browser SQL analytics engine' },
                { name: 'React 19',    license: 'MIT', desc: 'UI framework' },
                { name: 'Vite',        license: 'MIT', desc: 'Build tool' },
                { name: 'Tailwind v4', license: 'MIT', desc: 'Styling' },
                { name: 'Vitest',      license: 'MIT', desc: 'Unit testing' },
              ].map(t => (
                <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <div>
                    <span className="text-xs text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.desc}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">{t.license}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">

                <a href="https://github.com/stackme-io/StackMe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub →
              </a>
              <span className="text-xs text-muted-foreground/40">MIT License · free forever · self-hostable</span>
            </div>
          </div>
        )}
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