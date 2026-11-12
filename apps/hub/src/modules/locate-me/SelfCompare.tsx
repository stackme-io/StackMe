import { useTranslation } from 'react-i18next'
import type { Kind } from '@locateme/core/types'
import { BASELINE, publicPosition } from './baseline'

// "Where is this suite?" - computed in the browser against the public baseline shipped
// with the page. No request is made and nothing about the suite leaves the device.
export function SelfCompare({ byKind, calls, onOpenStats }: {
  byKind: Record<Kind, number>
  calls: number
  onOpenStats: () => void
}) {
  const { t } = useTranslation('locate-me')
  if (calls <= 0) return null
  const share = Math.round((1000 * byKind.fragile) / calls) / 10
  const pos = publicPosition(share)
  const median = BASELINE.comparable.median
  const text = pos.kind === 'zero'
    ? t('stats.selfZero', { pct: pos.pct })
    : t(pos.kind === 'more' ? 'stats.selfMore' : 'stats.selfLess', { share: share.toFixed(1), pct: pos.pct, median: median.toFixed(1) })
  return (
    <p className="text-meta text-muted-foreground flex-shrink-0 -mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-content">{text}</span>
      {calls < 50 && <span>{t('stats.selfSmall')}</span>}
      <span title={t('stats.selfLocal')}>
        <button onClick={onOpenStats} className="underline decoration-dotted underline-offset-2 hover:text-foreground">
          {t('stats.seeStats')}
        </button>
      </span>
    </p>
  )
}
