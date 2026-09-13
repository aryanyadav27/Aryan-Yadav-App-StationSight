import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchDataset, parseCsv, parseDate, parseNumber, SheetError } from './sheet'

describe('parseCsv', () => {
  it('splits plain rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('respects quotes, commas and doubled quotes inside fields', () => {
    expect(parseCsv('"1,234.50","say ""hi""",plain')).toEqual([['1,234.50', 'say "hi"', 'plain']])
  })

  it('handles newlines inside quoted fields and trailing CR', () => {
    expect(parseCsv('"line\none",b\r\nc,d')).toEqual([
      ['line\none', 'b'],
      ['c', 'd'],
    ])
  })
})

describe('parseDate', () => {
  it('reads the formats this sheet emits', () => {
    expect(parseDate('01-Jun-2026')).toBe('2026-06-01')
    expect(parseDate('1-Jun-2026')).toBe('2026-06-01')
    expect(parseDate('2026-06-01')).toBe('2026-06-01')
    expect(parseDate('31-Aug-2026')).toBe('2026-08-31')
  })

  it('rejects title and header rows rather than inventing a date', () => {
    expect(parseDate('MASTER DATA - DAILY OPENING NOZZLE READINGS')).toBeNull()
    expect(parseDate('Date')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate('01-Xxx-2026')).toBeNull()
  })
})

describe('parseNumber', () => {
  it('strips separators and currency prefixes', () => {
    expect(parseNumber('1,03,632.67')).toBe(103632.67)
    expect(parseNumber('Rs. 94.29')).toBe(94.29)
    expect(parseNumber('196,704.95')).toBe(196704.95)
  })

  it('returns null for blanks and text', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('  ')).toBeNull()
    expect(parseNumber('Nozzle 1 (MS)')).toBeNull()
  })
})

/** Two reading days + one rate day = exactly one sale day. */
const READINGS = [
  '"MASTER DATA - TITLE ROW Date","MACHINE 1 Nozzle 1 (MS)","Nozzle 2 (MS)","Nozzle 3 (HSD)","Nozzle 4 (HSD)","MACHINE 2 Nozzle 5 (MS)","Nozzle 6 (MS)","Nozzle 7 (HSD)","Nozzle 8 (HSD)","Month"',
  '"01-Jun-2026","100.00","200.00","300.00","400.00","500.00","600.00","700.00","800.00","Jun-2026"',
  '"02-Jun-2026","110.00","215.00","330.00","445.00","520.00","625.00","760.00","845.00","Jun-2026"',
].join('\n')

const RATES = [
  '"DAILY SELLING RATE TITLE Date","MS Rate (Rs./Ltr)","HSD Rate (Rs./Ltr)","Month"',
  '"01-Jun-2026","Rs. 100.00","Rs. 90.00","Jun-2026"',
  '"02-Jun-2026","Rs. 101.00","Rs. 91.00","Jun-2026"',
].join('\n')

function stubFetch(readings: string, rates: string, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    const body = url.includes('Nozzle') ? readings : rates
    return new Response(body, { status: ok ? 200 : 500 })
  })
}

afterEach(() => vi.restoreAllMocks())

describe('fetchDataset', () => {
  it('derives sale days from consecutive readings and the day rate', async () => {
    stubFetch(READINGS, RATES)
    const ds = await fetchDataset()

    expect(ds.source).toBe('Google Sheet')
    expect(ds.nozzles).toHaveLength(8)
    // only 01-Jun becomes a sale day: 02-Jun has no following reading
    expect(ds.days).toHaveLength(1)

    const day = ds.days[0]
    expect(day.date).toBe('2026-06-01')
    expect(day.msRate).toBe(100)
    expect(day.hsdRate).toBe(90)
    expect(day.open.N1).toBe(100)
    expect(day.ltr.N1).toBe(10) // 110 - 100
    expect(day.ltr.N4).toBe(45) // 445 - 400
    expect(day.ltr.N8).toBe(45) // 845 - 800
  })

  it('sorts readings that arrive out of order', async () => {
    const shuffled = [READINGS.split('\n')[0], READINGS.split('\n')[2], READINGS.split('\n')[1]].join('\n')
    stubFetch(shuffled, RATES)
    const ds = await fetchDataset()
    expect(ds.days[0].date).toBe('2026-06-01')
    expect(ds.days[0].ltr.N1).toBe(10)
  })

  it('never reports a negative sale when a meter appears to go backwards', async () => {
    const rollback = [
      READINGS.split('\n')[0],
      '"01-Jun-2026","100.00","200.00","300.00","400.00","500.00","600.00","700.00","800.00","Jun-2026"',
      '"02-Jun-2026","40.00","215.00","330.00","445.00","520.00","625.00","760.00","845.00","Jun-2026"',
    ].join('\n')
    stubFetch(rollback, RATES)
    const ds = await fetchDataset()
    expect(ds.days[0].ltr.N1).toBe(0)
  })

  it('skips a day that has readings but no published rate', async () => {
    stubFetch(READINGS, '"Title Date","MS","HSD"\n"05-Jun-2026","Rs. 100.00","Rs. 90.00"')
    await expect(fetchDataset()).rejects.toThrow(SheetError)
  })

  it('explains an unshared sheet instead of throwing a parse error', async () => {
    // a fresh Response per call - one body cannot be read twice
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('<!DOCTYPE html><html>sign in</html>', { status: 200 }),
    )
    await expect(fetchDataset()).rejects.toThrow(/not shared publicly/i)
  })

  it('surfaces an HTTP failure', async () => {
    stubFetch(READINGS, RATES, false)
    await expect(fetchDataset()).rejects.toThrow(/HTTP 500/)
  })
})
