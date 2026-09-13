import { byMonth, dailySeries, fuelStats, totalsFor } from '../lib/analytics'
import { litres, litresFull, money, monthLabel, moneyFull, rate, rate4 } from '../lib/format'
import type { Dataset, Day } from '../lib/types'
import { ValueTrend } from '../components/Charts'
import { Empty, FuelSplit, Section, Tile } from '../components/ui'

export function Dashboard({ ds, days }: { ds: Dataset; days: Day[] }) {
  if (!days.length) return <Empty>No days in this range.</Empty>

  const total = totalsFor(days, ds.nozzles)
  const ms = fuelStats(days, ds.nozzles, 'MS')
  const hsd = fuelStats(days, ds.nozzles, 'HSD')
  const months = byMonth(ds, days)
  const series = dailySeries(days, ds.nozzles)

  return (
    <>
      <Section>
        <div className="grid c2">
          <Tile label="Total sale value" value={money(total.value)} foot={moneyFull(total.value)} />
          <Tile label="Total volume" value={litres(total.ltr)} foot={litresFull(total.ltr)} />
          <Tile
            label="Avg per day"
            value={money(total.value / days.length)}
            foot={`over ${days.length} day${days.length > 1 ? 's' : ''}`}
            small
          />
          <Tile label="Avg per day" value={litres(total.ltr / days.length)} foot="volume" small />
        </div>
      </Section>

      <Section title="Petrol vs diesel">
        <div className="card">
          <FuelSplit ms={ms} hsd={hsd} />
          <div className="divide" />
          <div className="grid c2">
            <div className="tile ms">
              <div className="label">Petrol (MS)</div>
              <div className="value sm">{money(ms.value)}</div>
              <div className="foot">{litresFull(ms.ltr)}</div>
            </div>
            <div className="tile hsd">
              <div className="label">Diesel (HSD)</div>
              <div className="value sm">{money(hsd.value)}</div>
              <div className="foot">{litresFull(hsd.ltr)}</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Average price in this range">
        <div className="grid c2">
          <Tile label="Petrol · board rate" value={rate(ms.avgBoardRate)} foot={`realised ${rate4(ms.realisedRate)}`} tone="ms" />
          <Tile label="Diesel · board rate" value={rate(hsd.avgBoardRate)} foot={`realised ${rate4(hsd.realisedRate)}`} tone="hsd" />
        </div>
        <p className="note">
          <strong>Board rate</strong> is the plain average of the daily rates displayed. <strong>Realised</strong> is
          sale value ÷ litres, so it leans toward the days you actually sold more on.
        </p>
      </Section>

      <Section title="Daily sale value">
        <div className="card">
          <ValueTrend data={series} />
        </div>
      </Section>

      <Section title="Month-wise">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Days</th>
                  <th>Petrol</th>
                  <th>Diesel</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthLabel(m.month)}</td>
                    <td>{m.days}</td>
                    <td className="ms">{litres(m.ms.ltr)}</td>
                    <td className="hsd">{litres(m.hsd.ltr)}</td>
                    <td>{money(m.total.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>{days.length}</td>
                  <td className="ms">{litres(ms.ltr)}</td>
                  <td className="hsd">{litres(hsd.ltr)}</td>
                  <td>{money(total.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Section>
    </>
  )
}
