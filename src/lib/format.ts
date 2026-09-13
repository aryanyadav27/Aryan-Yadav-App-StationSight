const inr = new Intl.NumberFormat('en-IN')

/** Indian short-scale money: the unit a pump owner actually reads in. */
export function money(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  // spelled out, because a bare "L" next to a litre figure reads as litres
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} Lakh`
  if (a >= 1e3) return `₹${inr.format(Math.round(v))}`
  return `₹${v.toFixed(2)}`
}

export const moneyFull = (v: number) => `₹${inr.format(Number(v.toFixed(2)))}`

export function litres(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e5) return `${inr.format(Number((v / 1000).toFixed(1)))}k L`
  return `${inr.format(Number(v.toFixed(a >= 1000 ? 0 : 2)))} L`
}

export const litresFull = (v: number) => `${inr.format(Number(v.toFixed(2)))} L`
export const rate = (v: number) => `₹${v.toFixed(2)}`
export const rate4 = (v: number) => `₹${v.toFixed(4)}`
export const pct = (v: number) => `${v.toFixed(1)}%`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** '2026-06-01' -> '1 Jun' (dates are plain strings; never construct a Date, to dodge timezone drift) */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

export const fuelName = (f: 'MS' | 'HSD') => (f === 'MS' ? 'Petrol' : 'Diesel')
