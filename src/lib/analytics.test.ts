import { describe, expect, it } from 'vitest'
import dataset from '../data/dataset.json'
import oracle from './workbook-oracle.json'
import { byMonth, daysIn, fuelStats, nozzlesOf, perMachine, totalsFor } from './analytics'
import type { Dataset } from './types'

const ds = dataset as Dataset
const all = ds.days
const RUPEE = 0.01
const LITRE = 0.01

/**
 * The workbook's own Sales Summary / Monthly Summary sheets are the oracle.
 * If the app agrees with them on all 92 days it is computing the same business
 * figures the owner already trusts.
 */
describe('dataset integrity', () => {
  it('covers 92 contiguous sale days with 8 nozzles', () => {
    expect(ds.nozzles).toHaveLength(8)
    expect(all).toHaveLength(92)
    expect(ds.from).toBe('2026-06-01')
    expect(ds.to).toBe('2026-08-31')
  })

  it('splits 4 nozzles per machine, 2 MS and 2 HSD each', () => {
    for (const m of [1, 2] as const) {
      expect(nozzlesOf(ds, m)).toHaveLength(4)
      expect(nozzlesOf(ds, m, 'MS')).toHaveLength(2)
      expect(nozzlesOf(ds, m, 'HSD')).toHaveLength(2)
    }
  })

  it('never reports a negative litre figure', () => {
    for (const day of all) {
      for (const n of ds.nozzles) expect(day.ltr[n.id]).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('daily figures match the workbook', () => {
  it.each(oracle.daily.map((d, i) => [i, d] as const))('day %i (%o)', (_i, exp) => {
    const day = all.find((d) => d.date === exp.date)!
    expect(day).toBeDefined()
    const ms = totalsFor([day], nozzlesOf(ds, undefined, 'MS'))
    const hsd = totalsFor([day], nozzlesOf(ds, undefined, 'HSD'))
    expect(ms.ltr).toBeCloseTo(exp.ms, 2)
    expect(hsd.ltr).toBeCloseTo(exp.hsd, 2)
    expect(ms.value).toBeCloseTo(exp.msValue, 2)
    expect(hsd.value).toBeCloseTo(exp.hsdValue, 2)
  })
})

describe('monthly figures match the workbook', () => {
  const months = byMonth(ds, all)

  it('produces exactly three months', () => {
    expect(months.map((m) => m.month)).toEqual(['2026-06', '2026-07', '2026-08'])
  })

  it.each(oracle.months.map((m, i) => [m.label, i] as const))('%s', (_label, i) => {
    const got = months[i]
    const exp = oracle.months[i]
    expect(got.days).toBe(exp.days)
    expect(got.ms.ltr).toBeCloseTo(exp.msLtr, 2)
    expect(got.hsd.ltr).toBeCloseTo(exp.hsdLtr, 2)
    expect(got.ms.value).toBeCloseTo(exp.msValue, 2)
    expect(got.hsd.value).toBeCloseTo(exp.hsdValue, 2)
    expect(got.total.value).toBeCloseTo(exp.totalValue, 2)
    // the workbook's "Avg Rate" is AVERAGEIFS - a simple mean of board rates
    expect(got.ms.avgBoardRate).toBeCloseTo(exp.avgMsRate, 6)
    expect(got.hsd.avgBoardRate).toBeCloseTo(exp.avgHsdRate, 6)
  })
})

describe('grand totals match the workbook', () => {
  const ms = fuelStats(all, ds.nozzles, 'MS')
  const hsd = fuelStats(all, ds.nozzles, 'HSD')
  const g = oracle.grand

  it('litres, value and average rates', () => {
    expect(ms.ltr).toBeCloseTo(g.msLtr, 2)
    expect(hsd.ltr).toBeCloseTo(g.hsdLtr, 2)
    expect(ms.ltr + hsd.ltr).toBeCloseTo(g.totalLtr, 2)
    expect(ms.value).toBeCloseTo(g.msValue, 2)
    expect(hsd.value).toBeCloseTo(g.hsdValue, 2)
    expect(ms.value + hsd.value).toBeCloseTo(g.totalValue, 2)
  })

  /**
   * Deliberate divergence from the workbook.
   *
   * The GRAND TOTAL row averages the three MONTHLY averages rather than the 92
   * daily rates. June has 30 days and July/August 31, so that mean-of-means
   * overweights June and understates the true average by ~0.4 paise/litre.
   * Month by month the two agree exactly (asserted above); only the all-period
   * figure differs. The app reports the honest 92-day mean.
   */
  it('averages the actual days, not the monthly averages', () => {
    const meanOfMonthlyMeans = oracle.months.reduce((s, m) => s + m.avgMsRate, 0) / oracle.months.length
    expect(meanOfMonthlyMeans).toBeCloseTo(g.avgMsRate, 6) // that IS what the workbook did

    const trueMean = all.reduce((s, d) => s + d.msRate, 0) / all.length
    expect(ms.avgBoardRate).toBeCloseTo(trueMean, 9)
    expect(ms.avgBoardRate).toBeGreaterThan(g.avgMsRate)
    expect(ms.avgBoardRate - g.avgMsRate).toBeLessThan(0.01)

    const trueHsdMean = all.reduce((s, d) => s + d.hsdRate, 0) / all.length
    expect(hsd.avgBoardRate).toBeCloseTo(trueHsdMean, 9)
  })

  it('reports a realised rate distinct from the board average', () => {
    // volume weighting shifts the figure slightly - this is the point of showing both
    expect(ms.realisedRate).toBeCloseTo(g.msValue / g.msLtr, 6)
    expect(ms.realisedRate).not.toBe(ms.avgBoardRate)
  })
})

describe('machine and nozzle breakdowns are consistent', () => {
  it('the two machines sum to the combined total', () => {
    const [m1, m2] = perMachine(ds, all)
    const combined = totalsFor(all, ds.nozzles)
    expect(m1.totals.ltr + m2.totals.ltr).toBeCloseTo(combined.ltr, LITRE)
    expect(m1.totals.value + m2.totals.value).toBeCloseTo(combined.value, RUPEE)
  })

  it('each machine MS + HSD sums to its own total', () => {
    for (const m of perMachine(ds, all)) {
      expect(m.ms.ltr + m.hsd.ltr).toBeCloseTo(m.totals.ltr, LITRE)
      expect(m.ms.value + m.hsd.value).toBeCloseTo(m.totals.value, RUPEE)
    }
  })

  it('all 8 nozzles individually sum to the combined total', () => {
    const sum = ds.nozzles.reduce(
      (acc, n) => {
        const t = totalsFor(all, [n])
        return { ltr: acc.ltr + t.ltr, value: acc.value + t.value }
      },
      { ltr: 0, value: 0 },
    )
    const combined = totalsFor(all, ds.nozzles)
    expect(sum.ltr).toBeCloseTo(combined.ltr, LITRE)
    expect(sum.value).toBeCloseTo(combined.value, RUPEE)
  })
})

describe('date filtering', () => {
  it('slices an inclusive range', () => {
    const june = daysIn(ds, { from: '2026-06-01', to: '2026-06-30' })
    expect(june).toHaveLength(30)
    expect(june[0].date).toBe('2026-06-01')
    expect(june[29].date).toBe('2026-06-30')
  })

  it('returns zeroes rather than NaN for an empty range', () => {
    const none = daysIn(ds, { from: '2027-01-01', to: '2027-01-31' })
    const stats = fuelStats(none, ds.nozzles, 'MS')
    expect(stats.ltr).toBe(0)
    expect(stats.avgBoardRate).toBe(0)
    expect(stats.realisedRate).toBe(0)
  })
})
