import { monthLabel } from '../lib/format'
import type { DateRange } from '../lib/types'

export interface Preset {
  id: string
  label: string
  range: DateRange
}

/** All / each month / last 30 days - built from the dataset, never hard-coded. */
export function buildPresets(from: string, to: string, months: string[]): Preset[] {
  const presets: Preset[] = [{ id: 'all', label: 'All time', range: { from, to } }]

  for (const m of months) {
    presets.push({ id: m, label: monthLabel(m), range: { from: `${m}-01`, to: `${m}-31` } })
  }

  const last30 = addDays(to, -29)
  presets.push({ id: 'last30', label: 'Last 30 days', range: { from: last30 < from ? from : last30, to } })
  return presets
}

/** Plain-string date maths in UTC so a device timezone can never shift a day. */
export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function RangeFilter({
  presets,
  activeId,
  range,
  bounds,
  onPreset,
  onRange,
}: {
  presets: Preset[]
  activeId: string | null
  range: DateRange
  bounds: DateRange
  onPreset: (p: Preset) => void
  onRange: (r: DateRange) => void
}) {
  return (
    <>
      <div className="ranges">
        {presets.map((p) => (
          <button key={p.id} className="chip" aria-pressed={activeId === p.id} onClick={() => onPreset(p)}>
            {p.label}
          </button>
        ))}
        <button className="chip" aria-pressed={activeId === null}>
          Custom
        </button>
      </div>
      <div className="custom-range">
        <input
          type="date"
          value={range.from}
          min={bounds.from}
          max={range.to}
          aria-label="From date"
          onChange={(e) => e.target.value && onRange({ ...range, from: e.target.value })}
        />
        <span>to</span>
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={bounds.to}
          aria-label="To date"
          onChange={(e) => e.target.value && onRange({ ...range, to: e.target.value })}
        />
      </div>
    </>
  )
}
