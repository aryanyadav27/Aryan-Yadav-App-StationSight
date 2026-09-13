import type { Dataset, DateRange, Day, Fuel, FuelStats, MachineId, Nozzle, Totals } from './types'

/** A nozzle carries no price of its own - it inherits its fuel's board rate. */
export const rateFor = (day: Day, fuel: Fuel): number => (fuel === 'MS' ? day.msRate : day.hsdRate)

export const daysIn = (ds: Dataset, range: DateRange): Day[] =>
  ds.days.filter((d) => d.date >= range.from && d.date <= range.to)

export const nozzlesOf = (ds: Dataset, machine?: MachineId, fuel?: Fuel): Nozzle[] =>
  ds.nozzles.filter((n) => (machine === undefined || n.machine === machine) && (fuel === undefined || n.fuel === fuel))

const EMPTY: Totals = { ltr: 0, value: 0 }

/** Litres and rupees for a given set of nozzles over a given set of days. */
export function totalsFor(days: Day[], nozzles: Nozzle[]): Totals {
  let ltr = 0
  let value = 0
  for (const day of days) {
    for (const n of nozzles) {
      const l = day.ltr[n.id] ?? 0
      ltr += l
      value += l * rateFor(day, n.fuel)
    }
  }
  return { ltr, value }
}

/**
 * Both averages are reported because they answer different questions:
 * avgBoardRate is the price that was displayed, realisedRate is the price
 * that was actually achieved once volume is taken into account.
 */
export function fuelStats(days: Day[], nozzles: Nozzle[], fuel: Fuel): FuelStats {
  const of = nozzles.filter((n) => n.fuel === fuel)
  const { ltr, value } = totalsFor(days, of)
  const rateSum = days.reduce((s, d) => s + rateFor(d, fuel), 0)
  return {
    ltr,
    value,
    avgBoardRate: days.length ? rateSum / days.length : 0,
    realisedRate: ltr ? value / ltr : 0,
    days: days.length,
  }
}

export function perNozzle(days: Day[], nozzles: Nozzle[]): { nozzle: Nozzle; totals: Totals }[] {
  return nozzles.map((nozzle) => ({ nozzle, totals: totalsFor(days, [nozzle]) }))
}

export function perMachine(ds: Dataset, days: Day[]): { machine: MachineId; totals: Totals; ms: Totals; hsd: Totals }[] {
  return ([1, 2] as MachineId[]).map((machine) => {
    const all = nozzlesOf(ds, machine)
    return {
      machine,
      totals: totalsFor(days, all),
      ms: totalsFor(days, all.filter((n) => n.fuel === 'MS')),
      hsd: totalsFor(days, all.filter((n) => n.fuel === 'HSD')),
    }
  })
}

/** Daily series for charting: one point per day for the chosen nozzle set. */
export function dailySeries(days: Day[], nozzles: Nozzle[]) {
  return days.map((day) => {
    let ltr = 0
    let value = 0
    for (const n of nozzles) {
      const l = day.ltr[n.id] ?? 0
      ltr += l
      value += l * rateFor(day, n.fuel)
    }
    return { date: day.date, ltr, value, msRate: day.msRate, hsdRate: day.hsdRate }
  })
}

export const monthKey = (date: string) => date.slice(0, 7)

export function monthsIn(ds: Dataset): string[] {
  return [...new Set(ds.days.map((d) => monthKey(d.date)))].sort()
}

/** Month-wise breakdown, mirroring the workbook's Monthly Summary sheet. */
export function byMonth(ds: Dataset, days: Day[]) {
  const groups = new Map<string, Day[]>()
  for (const d of days) {
    const k = monthKey(d.date)
    const g = groups.get(k)
    if (g) g.push(d)
    else groups.set(k, [d])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ds_]) => ({
      month,
      days: ds_.length,
      ms: fuelStats(ds_, ds.nozzles, 'MS'),
      hsd: fuelStats(ds_, ds.nozzles, 'HSD'),
      total: totalsFor(ds_, ds.nozzles),
    }))
}

export function rateExtremes(days: Day[], fuel: Fuel) {
  if (!days.length) return { min: 0, max: 0, first: 0, last: 0 }
  const rates = days.map((d) => rateFor(d, fuel))
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
    first: rates[0],
    last: rates[rates.length - 1],
  }
}

export const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0)

export { EMPTY }
