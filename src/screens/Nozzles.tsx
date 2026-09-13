import { useState } from 'react'
import { dailySeries, rateFor, share, totalsFor } from '../lib/analytics'
import { litres, litresFull, longDate, money, moneyFull, rate, pct, fuelName } from '../lib/format'
import type { Dataset, Day, Nozzle } from '../lib/types'
import { LitreTrend } from '../components/Charts'
import { Chevron, Empty, FuelSplit, Section, Tile, ValuePair } from '../components/ui'

export function Nozzles({ ds, days }: { ds: Dataset; days: Day[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  if (!days.length) return <Empty>No days in this range.</Empty>

  const nozzle = ds.nozzles.find((n) => n.id === selected)
  if (nozzle) return <NozzleDetail ds={ds} days={days} nozzle={nozzle} onBack={() => setSelected(null)} />

  const combined = totalsFor(days, ds.nozzles)
  const ms = totalsFor(days, ds.nozzles.filter((n) => n.fuel === 'MS'))
  const hsd = totalsFor(days, ds.nozzles.filter((n) => n.fuel === 'HSD'))

  return (
    <>
      <Section title="All 8 nozzles combined">
        <div className="grid c2">
          <Tile label="Total value" value={money(combined.value)} foot={moneyFull(combined.value)} />
          <Tile label="Total volume" value={litres(combined.ltr)} foot={litresFull(combined.ltr)} />
        </div>
        <div className="card" style={{ marginTop: 10 }}>
          <FuelSplit ms={ms} hsd={hsd} />
        </div>
      </Section>

      <Section title="Individual nozzles">
        <div className="card" style={{ padding: 0 }}>
          {ds.nozzles.map((n) => {
            const t = totalsFor(days, [n])
            return (
              <button key={n.id} className="row" onClick={() => setSelected(n.id)}>
                <i className={`dot ${n.fuel === 'MS' ? 'ms' : 'hsd'}`} />
                <div className="main">
                  <div className="title">{n.label}</div>
                  <div className="meta">
                    <span className={`tag m${n.machine}`}>M{n.machine}</span>{' '}
                    {fuelName(n.fuel)} · {pct(share(t.ltr, combined.ltr))} of total
                  </div>
                </div>
                <ValuePair t={t} />
                <Chevron />
              </button>
            )
          })}
        </div>
      </Section>
    </>
  )
}

function NozzleDetail({
  ds,
  days,
  nozzle,
  onBack,
}: {
  ds: Dataset
  days: Day[]
  nozzle: Nozzle
  onBack: () => void
}) {
  const t = totalsFor(days, [nozzle])
  const combined = totalsFor(days, ds.nozzles)
  const series = dailySeries(days, [nozzle])
  const best = series.reduce((a, b) => (b.ltr > a.ltr ? b : a))

  return (
    <>
      <button className="back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All nozzles
      </button>

      <Section>
        <div className="card">
          <div className="card-head">
            <h3>{nozzle.label}</h3>
            <div>
              <span className={`tag m${nozzle.machine}`}>Machine {nozzle.machine}</span>{' '}
              <span className={`tag ${nozzle.fuel === 'MS' ? 'ms' : 'hsd'}`}>{fuelName(nozzle.fuel)}</span>
            </div>
          </div>
          <div className="grid c2">
            <Tile label="Sale value" value={money(t.value)} foot={moneyFull(t.value)} small />
            <Tile label="Volume" value={litres(t.ltr)} foot={litresFull(t.ltr)} small />
            <Tile label="Share of station" value={pct(share(t.ltr, combined.ltr))} foot="by volume" small />
            <Tile label="Avg per day" value={litres(t.ltr / days.length)} foot={`best ${litres(best.ltr)}`} small />
          </div>
        </div>
      </Section>

      <Section title="Daily volume">
        <div className="card">
          <LitreTrend
            data={series}
            series={[{ key: 'ltr', name: nozzle.label, color: nozzle.fuel === 'MS' ? '#e08900' : '#0f9d76' }]}
          />
        </div>
      </Section>

      <Section title="Day by day">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opening</th>
                  <th>Litres</th>
                  <th>Rate</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const l = d.ltr[nozzle.id]
                  const r = rateFor(d, nozzle.fuel)
                  return (
                    <tr key={d.date}>
                      <td>{longDate(d.date)}</td>
                      <td>{d.open[nozzle.id].toFixed(2)}</td>
                      <td>{l.toFixed(2)}</td>
                      <td>{rate(r)}</td>
                      <td>{moneyFull(l * r)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td />
                  <td>{t.ltr.toFixed(2)}</td>
                  <td />
                  <td>{moneyFull(t.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <p className="note">
          Opening is the totaliser reading at the start of that day. Litres sold is the next day's opening minus this
          one — the same way the workbook derives it.
        </p>
      </Section>
    </>
  )
}
