import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../../api/client'

// Public baseline from the open-source study (data from 7 September 2026, after the
// classifier correction). The "comparable" row uses the same 50+ locator rule as shared
// results, so the two columns measure the same thing.
const BASELINE = {
  tiers: [
    { key: 'top', pct: 2.5 },
    { key: 'mid', pct: 2.8 },
    { key: 'tail', pct: 2.9 },
  ],
  habits: { position: 45, text: 45, xpath: 2.6 },
  comparable: { suites: 189, median: 1.2, pooled: 2.7, none: 33, position: 44.4, text: 45.3, xpath: 2.7 },
}

interface Summary {
  suites: number
  median_fragile_pct: number
  pooled_fragile_pct: number | null
  no_fragile_pct: number
  position_pct: number | null
  text_pct: number | null
  xpath_pct: number | null
}
interface StatsResponse {
  suites: number
  min_suites: number
  overall: Summary | null
  by_framework: Array<Summary & { framework: string }>
  by_age: Array<Summary & { age: string }>
}

const pct = (v: number | null | undefined) => (v == null ? '-' : `${v}%`)

export function StatsTab({ active }: { active: boolean }) {
  const { t } = useTranslation('locate-me')
  const [data, setData] = useState<StatsResponse | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    apiClient.get<StatsResponse>('/api/locate/stats/summary')
      .then(r => { if (!cancelled) { setData(r.data); setFailed(false) } })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [active])

  const o = data?.overall
  return (
    <div className="max-w-3xl flex flex-col gap-6 text-body leading-relaxed text-content pb-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-title text-foreground">{t('stats.title')}</h2>
        <p>{t('stats.intro')}</p>
      </div>

      {/* Baseline: published numbers, labelled as ours, never mixed with user rows. */}
      <section className="flex flex-col gap-3">
        <h3 className="text-heading text-foreground">{t('stats.baselineTitle')}</h3>
        <p className="text-sub text-muted-foreground">{t('stats.baselineNote')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {BASELINE.tiers.map(tier => (
            <div key={tier.key} className="border border-border rounded-lg bg-muted/20 px-4 py-3">
              <p className="text-meta text-muted-foreground">{t(`stats.tier.${tier.key}`)}</p>
              <p className="text-title text-foreground">{tier.pct}%</p>
              <p className="text-meta text-muted-foreground">{t('stats.fragileShare')}</p>
            </div>
          ))}
        </div>
        <p className="text-sub">{t('stats.baselineHabits', BASELINE.habits)}</p>
        <a href="/study.html" target="_blank" rel="noopener noreferrer"
          className="text-sub text-[var(--tool-accent,#22d3ee)] hover:underline self-start">{t('stats.studyLink')}</a>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-heading text-foreground">{t('stats.sharedTitle')}</h3>
        {failed && <p className="text-sub text-amber-400/90">{t('stats.loadFailed')}</p>}
        {!data && !failed && <p className="text-sub text-muted-foreground animate-pulse">...</p>}
        {data && !o && (
          <p className="text-sub">{t('stats.notYet', { count: data.suites, min: data.min_suites })}</p>
        )}
        {data && o && (
          <div className="overflow-x-auto">
            <table className="w-full text-sub border-collapse">
              <thead>
                <tr className="text-meta text-muted-foreground text-left">
                  <th className="py-1.5 pr-3 font-normal"></th>
                  <th className="py-1.5 px-3 font-normal">{t('stats.colShared', { count: o.suites })}</th>
                  <th className="py-1.5 pl-3 font-normal">{t('stats.colPublic', { count: BASELINE.comparable.suites })}</th>
                </tr>
              </thead>
              <tbody>
                <Row label={t('stats.rowMedian')} a={pct(o.median_fragile_pct)} b={pct(BASELINE.comparable.median)} />
                <Row label={t('stats.rowPooled')} a={pct(o.pooled_fragile_pct)} b={pct(BASELINE.comparable.pooled)} />
                <Row label={t('stats.rowNone')} a={pct(o.no_fragile_pct)} b={pct(BASELINE.comparable.none)} />
                <Row label={t('stats.rowPosition')} a={pct(o.position_pct)} b={pct(BASELINE.comparable.position)} />
                <Row label={t('stats.rowText')} a={pct(o.text_pct)} b={pct(BASELINE.comparable.text)} />
                <Row label={t('stats.rowXpath')} a={pct(o.xpath_pct)} b={pct(BASELINE.comparable.xpath)} />
              </tbody>
            </table>
          </div>
        )}
        {data && o && (data.by_framework.length > 0 || data.by_age.length > 0) && (
          <div className="flex flex-col gap-1">
            {data.by_framework.map(g => (
              <p key={g.framework} className="text-sub">{t('stats.groupLine', { name: g.framework, count: g.suites, median: g.median_fragile_pct })}</p>
            ))}
            {data.by_age.map(g => (
              <p key={g.age} className="text-sub">{t('stats.groupLine', { name: t(`stats.age.${g.age}`), count: g.suites, median: g.median_fragile_pct })}</p>
            ))}
          </div>
        )}
        <p className="text-meta text-muted-foreground">{t('stats.caveat', { min: data?.min_suites ?? 10 })}</p>
      </section>
    </div>
  )
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr className="border-t border-border/50">
      <td className="py-2 pr-3 text-muted-foreground">{label}</td>
      <td className="py-2 px-3 text-foreground font-medium">{a}</td>
      <td className="py-2 pl-3 text-foreground">{b}</td>
    </tr>
  )
}
