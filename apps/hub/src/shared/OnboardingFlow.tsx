import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronRight, Lightbulb } from 'lucide-react'

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
    <div className={`grid transition-all duration-300 ease-out ${visible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
      <div className="overflow-hidden">
        <div className="relative border border-border border-l-[3px] border-l-primary bg-card shadow-sm rounded-xl px-5 pt-3 pb-4 mb-5">

          {/* × session close */}
          <button
            onClick={onHideSession}
            aria-label={t('common.hide')}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-border/30 pr-10">
            <Lightbulb className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-[11px] font-semibold text-foreground">{t('common.howItWorks')}</span>
            <span className="text-muted-foreground/30 select-none mx-0.5">|</span>
            <button
              onClick={onHidePermanent}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('common.gotIt')}
            </button>
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row md:items-stretch gap-0">
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <div className="flex-1 flex gap-3 min-w-0 items-start py-1 px-2">
                  <span className="flex-shrink-0 text-sm font-semibold text-primary w-4 text-center leading-relaxed">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{step.title}</span>
                    <span className="block text-xs text-muted-foreground leading-relaxed">{step.desc}</span>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center w-8 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>


        </div>
      </div>
    </div>
  )
}
