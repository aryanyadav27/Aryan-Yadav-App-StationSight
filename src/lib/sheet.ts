import type { Dataset, Day, Nozzle } from './types'

/**
 * Reads the master data straight from the owner's Google Sheet.
 *
 * The sheet is published read-only, and Google's gviz CSV endpoint sends
 * permissive CORS headers, so the browser can fetch it with no backend and no
 * API key. Everything here is parsing and validation - the app never writes.
 */
export const SHEET_ID = '1SSVHvAYlNGvwwtoJsFV7ydcxjQqhcaQ1BhaIuWyKrzU'

export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`

const csvUrl = (sheet: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`

export const NOZZLES: Nozzle[] = [
  { id: 'N1', label: 'Nozzle 1', machine: 1, fuel: 'MS' },
  { id: 'N2', label: 'Nozzle 2', machine: 1, fuel: 'MS' },
  { id: 'N3', label: 'Nozzle 3', machine: 1, fuel: 'HSD' },
  { id: 'N4', label: 'Nozzle 4', machine: 1, fuel: 'HSD' },
  { id: 'N5', label: 'Nozzle 5', machine: 2, fuel: 'MS' },
  { id: 'N6', label: 'Nozzle 6', machine: 2, fuel: 'MS' },
  { id: 'N7', label: 'Nozzle 7', machine: 2, fuel: 'HSD' },
  { id: 'N8', label: 'Nozzle 8', machine: 2, fuel: 'HSD' },
]

/** RFC4180-ish CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
      continue
    }

    if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }

  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Sheets hands dates back in whatever the cell format is. Accepts the two
 * shapes this sheet produces - '01-Jun-2026' and '2026-06-01' - and returns an
 * ISO day string, or null when the cell simply is not a date (title rows).
 */
export function parseDate(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const dmy = /^(\d{1,2})[-/\s]([A-Za-z]{3,})[-/\s](\d{4})$/.exec(v)
  if (dmy) {
    const m = MONTHS.indexOf(dmy[2].slice(0, 3).toLowerCase())
    if (m < 0) return null
    return `${dmy[3]}-${String(m + 1).padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  return null
}

/**
 * Strips thousands separators and currency prefixes ('Rs. 94.29',
 * '1,03,632.67'). The currency prefix is removed as a unit - stripping it
 * character by character would leave the full stop in 'Rs.' behind and turn
 * the value into '.94.29'.
 */
export function parseNumber(raw: string): number | null {
  const stripped = raw
    .replace(/[,\s₹]/g, '')
    .replace(/^(?:rs\.?|inr)/i, '')
  return /^-?\d+(?:\.\d+)?$/.test(stripped) ? Number(stripped) : null
}

export class SheetError extends Error {}

async function fetchCsv(sheet: string, signal?: AbortSignal): Promise<string[][]> {
  const res = await fetch(csvUrl(sheet), { signal, cache: 'no-store' })
  if (!res.ok) throw new SheetError(`Could not read the "${sheet}" tab (HTTP ${res.status}).`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new SheetError('The sheet is not shared publicly, so the app cannot read it.')
  }
  return parseCsv(text)
}

/** Keeps only rows whose first cell is a real date, so title/header rows drop out. */
function dataRows(rows: string[][]): { date: string; cells: string[] }[] {
  const out: { date: string; cells: string[] }[] = []
  for (const cells of rows) {
    const date = parseDate(cells[0] ?? '')
    if (date) out.push({ date, cells })
  }
  return out
}

export async function fetchDataset(signal?: AbortSignal): Promise<Dataset> {
  const [readingRows, rateRows] = await Promise.all([
    fetchCsv('Nozzle Readings', signal),
    fetchCsv('Daily Rates', signal),
  ])

  const readings = dataRows(readingRows)
  const rates = new Map<string, { ms: number; hsd: number }>()

  for (const { date, cells } of dataRows(rateRows)) {
    const ms = parseNumber(cells[1] ?? '')
    const hsd = parseNumber(cells[2] ?? '')
    if (ms !== null && hsd !== null) rates.set(date, { ms, hsd })
  }

  if (readings.length < 2) throw new SheetError('The Nozzle Readings tab has fewer than two days of readings.')
  if (!rates.size) throw new SheetError('The Daily Rates tab has no usable rates.')

  readings.sort((a, b) => a.date.localeCompare(b.date))

  const days: Day[] = []
  for (let i = 0; i < readings.length - 1; i++) {
    const cur = readings[i]
    const next = readings[i + 1]
    const rate = rates.get(cur.date)
    // A day needs a rate and a following reading before it can become a sale day.
    if (!rate) continue

    const open: Record<string, number> = {}
    const ltr: Record<string, number> = {}
    let complete = true

    for (let n = 0; n < NOZZLES.length; n++) {
      const a = parseNumber(cur.cells[n + 1] ?? '')
      const b = parseNumber(next.cells[n + 1] ?? '')
      if (a === null || b === null) {
        complete = false
        break
      }
      open[NOZZLES[n].id] = round2(a)
      // a totaliser only ever climbs; a drop means a meter reset or a typo, not a negative sale
      ltr[NOZZLES[n].id] = round2(Math.max(0, b - a))
    }
    if (!complete) continue

    days.push({ date: cur.date, msRate: rate.ms, hsdRate: rate.hsd, open, ltr })
  }

  if (!days.length) throw new SheetError('No complete sale days found - every day needs a rate and a next-day reading.')

  return {
    source: 'Google Sheet',
    nozzles: NOZZLES,
    from: days[0].date,
    to: days[days.length - 1].date,
    days,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
