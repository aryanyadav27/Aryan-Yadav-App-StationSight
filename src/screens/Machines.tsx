import { dailySeries, nozzlesOf, perMachine, share, totalsFor } from '../lib/analytics'
import { litres, litresFull, money, pct } from '../lib/format'
import type { Dataset, Day, MachineId } from '../lib/types'
import { LitreTrend } from '../components/Charts'
import { Empty, Section, SplitBar } from '../components/ui'

const COLOR: Record<MachineId, string> = { 1: 'var(--m1)', 2: 'var(--m2)' }

export function Machines({ ds, days }: { ds: Dataset; days: Day[] }) {
  if (!days.length) return <Empty>No days in this range.</Empty>

  const machines = perMachine(ds, days)
  const combined = totalsFor(days, ds.nozzles)

  const trend = dailySeries(days, ds.nozzles).map((p, i) => ({
    date: p.date,
    m1: dailySeries([days[i]], nozzlesOf(ds, 1))[0].ltr,
    m2: dailySeries([days[i]], nozzlesOf(ds, 2))[0].ltr,
  }))

  return (
    <>
      <Section title="Share of total volume">
        <div className="card">
          <div className="bar">
            {machines.map((m) => (
              <i
                key={m.machine}
                style={{ width: `${share(m.totals.ltr, combined.ltr)}%`, background: COLOR[m.machine] }}
              />
            ))}
          </div>
          <div className="legend">
            {machines.map((m) => (
              <span key={m.machine}>
                <i className="dot" style={{ background: COLOR[m.machine] }} /> Machine {m.machine}{' '}
                {pct(share(m.totals.ltr, combined.ltr))}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {machines.map((m) => (
        <Section key={m.machine} title={`Machine ${m.machine}`}>
          <div className="card">
            <div className="card-head">
              <h3>
                <span className={`tag m${m.machine}`}>Machine {m.machine}</span>
              </h3>
              <div className="num">
                <div className="big">{money(m.totals.value)}</div>
                <div className="small">{litresFull(m.totals.ltr)}</div>
              </div>
            </div>

            <SplitBar ms={m.ms.ltr} hsd={m.hsd.ltr} />
            <div className="legend">
              <span>
                <i className="dot ms" /> Petrol {litres(m.ms.ltr)} · {money(m.ms.value)}
              </span>
              <span>
                <i className="dot hsd" /> Diesel {litres(m.hsd.ltr)} · {money(m.hsd.value)}
              </span>
            </div>

            <div className="divide" />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nozzle</th>
                    <th>Fuel</th>
                    <th>Litres</th>
                    <th>Value</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {nozzlesOf(ds, m.machine).map((n) => {
                    const t = totalsFor(days, [n])
                    return (
                      <tr key={n.id}>
                        <td>{n.label}</td>
                        <td className={n.fuel === 'MS' ? 'ms' : 'hsd'}>{n.fuel === 'MS' ? 'Petrol' : 'Diesel'}</td>
                        <td>{litres(t.ltr)}</td>
                        <td>{money(t.value)}</td>
                        <td>{pct(share(t.ltr, m.totals.ltr))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      ))}

      <Section title="Daily volume, machine vs machine">
        <div className="card">
          <LitreTrend
            data={trend}
            series={[
              { key: 'm1', name: 'Machine 1', color: '#007dc6' },
              { key: 'm2', name: 'Machine 2', color: '#7b53c9' },
            ]}
          />
        </div>
      </Section>
    </>
  )
}
