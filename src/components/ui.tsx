import type { ReactNode } from 'react'
import { litres, money, pct } from '../lib/format'
import type { Totals } from '../lib/types'

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="section">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

export function Tile({
  label,
  value,
  foot,
  tone,
  small,
}: {
  label: string
  value: string
  foot?: string
  tone?: 'ms' | 'hsd'
  small?: boolean
}) {
  return (
    <div className={`card tile ${tone ?? ''}`}>
      <div className="label">{label}</div>
      <div className={`value ${small ? 'sm' : ''}`}>{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  )
}

/** Petrol / diesel split as a single proportional bar. */
export function SplitBar({ ms, hsd }: { ms: number; hsd: number }) {
  const total = ms + hsd
  const msPct = total ? (ms / total) * 100 : 50
  return (
    <div className="bar" role="presentation">
      <i style={{ width: `${msPct}%`, background: 'var(--ms)' }} />
      <i style={{ width: `${100 - msPct}%`, background: 'var(--hsd)' }} />
    </div>
  )
}

export function FuelSplit({ ms, hsd }: { ms: Totals; hsd: Totals }) {
  const total = ms.ltr + hsd.ltr
  return (
    <>
      <SplitBar ms={ms.ltr} hsd={hsd.ltr} />
      <div className="legend">
        <span>
          <i className="dot ms" /> Petrol {litres(ms.ltr)} · {pct((ms.ltr / (total || 1)) * 100)}
        </span>
        <span>
          <i className="dot hsd" /> Diesel {litres(hsd.ltr)} · {pct((hsd.ltr / (total || 1)) * 100)}
        </span>
      </div>
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ValuePair({ t }: { t: Totals }) {
  return (
    <div className="num">
      <div className="big">{money(t.value)}</div>
      <div className="small">{litres(t.ltr)}</div>
    </div>
  )
}

export const Chevron = () => (
  <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
