import { byMonth, fuelStats, rateExtremes } from '../lib/analytics'
import { longDate, monthLabel, rate, rate4 } from '../lib/format'
import type { Dataset, Day, Fuel } from '../lib/types'
import { RateTrend } from '../components/Charts'
import { Empty, Section, Tile } from '../components/ui'

export function Prices({ ds, days }: { ds: Dataset; days: Day[] }) {
  if (!days.length) return <Empty>No days in this range.</Empty>

  const ms = fuelStats(days, ds.nozzles, 'MS')
  const hsd = fuelStats(days, ds.nozzles, 'HSD')
  const months = byMonth(ds, days)

  return (
    <>
      <Section title="Average price in this range">
        <div className="grid c2">
          <Tile label="Petrol · board rate" value={rate(ms.avgBoardRate)} foot={rate4(ms.avgBoardRate)} tone="ms" />
          <Tile label="Diesel · board rate" value={rate(hsd.avgBoardRate)} foot={rate4(hsd.avgBoardRate)} tone="hsd" />
          <Tile label="Petrol · realised" value={rate(ms.realisedRate)} foot={rate4(ms.realisedRate)} tone="ms" small />
          <Tile label="Diesel · realised" value={rate(hsd.realisedRate)} foot={rate4(hsd.realisedRate)} tone="hsd" small />
        </div>
        <p className="note">
          Board rate averages the {days.length} daily rates equally. Realised weights each day by the litres actually
          sold, so it answers “what did a litre really fetch?”
        </p>
      </Section>

      <Section title="Rate movement">
        <div className="card">
          <RateTrend data={days} />
          <div className="legend">
            <span>
              <i className="dot ms" /> Petrol
            </span>
            <span>
              <i className="dot hsd" /> Diesel
            </span>
          </div>
        </div>
      </Section>

      <Section title="High / low">
        <div className="grid c2">
          <Extremes days={days} fuel="MS" />
          <Extremes days={days} fuel="HSD" />
        </div>
      </Section>

      <Section title="Month-wise average rate">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Days</th>
                  <th>Petrol</th>
                  <th>Diesel</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthLabel(m.month)}</td>
                    <td>{m.days}</td>
                    <td className="ms">{rate(m.ms.avgBoardRate)}</td>
                    <td className="hsd">{rate(m.hsd.avgBoardRate)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Overall</td>
                  <td>{days.length}</td>
                  <td className="ms">{rate(ms.avgBoardRate)}</td>
                  <td className="hsd">{rate(hsd.avgBoardRate)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Daily rate log">
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Petrol</th>
                  <th>Diesel</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <td>{longDate(d.date)}</td>
                    <td className="ms">{rate(d.msRate)}</td>
                    <td className="hsd">{rate(d.hsdRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </>
  )
}

function Extremes({ days, fuel }: { days: Day[]; fuel: Fuel }) {
  const e = rateExtremes(days, fuel)
  const tone = fuel === 'MS' ? 'ms' : 'hsd'
  const change = e.last - e.first
  return (
    <div className={`card tile ${tone}`}>
      <div className="label">{fuel === 'MS' ? 'Petrol' : 'Diesel'}</div>
      <div className="value sm">
        {rate(e.min)} – {rate(e.max)}
      </div>
      <div className="foot">
        ended {rate(e.last)} · {change >= 0 ? '+' : '−'}
        {Math.abs(change).toFixed(2)} over the range
      </div>
    </div>
  )
}
