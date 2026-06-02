import { useTranslation } from 'react-i18next'

interface Step {
  title: string
  desc:  string
}

interface OnboardingFlowProps {
  steps:           Step[]
  visible:         boolean
  onHideSession:   () => void
  onHidePermanent: () => void
}

export function OnboardingFlow({ steps, visible, onHideSession, onHidePermanent }: OnboardingFlowProps) {
  const { t } = useTranslation()
  return (
    <div className={`grid transition-all duration-200 ${visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        <div className="relative border border-border/70 bg-muted/10 rounded-xl px-5 py-3 mb-5">

          {/* × session close */}
          <button
            onClick={onHideSession}
            className="absolute top-2.5 right-3 text-muted-foreground/70 hover:text-foreground transition-colors text-sm leading-none"
            aria-label="Hide"
          >
            ×
          </button>

          {/* Steps row */}
          <div className="flex items-center gap-2 pr-6">
            {steps.map((step, i) => (
              <>
                <div key={step.title} className="flex-1 flex flex-col gap-0.5 bg-muted/20 border border-muted-foreground/30 rounded-lg px-3 py-2.5 min-w-0">
                  <span className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-widest">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {step.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground/95 leading-relaxed">
                    {step.desc}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span key={`arrow-${i}`} className="text-muted-foreground/80 text-sm flex-shrink-0">
                    →
                  </span>
                )}
              </>
            ))}
          </div>

          {/* Got it */}
          <div className="flex justify-end mt-2">
            <button
              onClick={onHidePermanent}
              className="text-[10px] text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              {t('common.gotIt')}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
