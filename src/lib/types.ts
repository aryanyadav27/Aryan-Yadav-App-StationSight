export type Fuel = 'MS' | 'HSD'
export type MachineId = 1 | 2

export interface Nozzle {
  id: string
  label: string
  machine: MachineId
  fuel: Fuel
}

/** One sale day: opening totaliser per nozzle, litres sold per nozzle, board rates. */
export interface Day {
  date: string
  msRate: number
  hsdRate: number
  open: Record<string, number>
  ltr: Record<string, number>
}

export interface Dataset {
  source: string
  nozzles: Nozzle[]
  from: string
  to: string
  days: Day[]
}

export interface DateRange {
  from: string
  to: string
}

/** Litres + rupees for one slice of the data. */
export interface Totals {
  ltr: number
  value: number
}

export interface FuelStats extends Totals {
  /** Simple mean of daily board rates - matches the workbook's AVERAGEIFS. */
  avgBoardRate: number
  /** value / litres - what was actually realised across the range. */
  realisedRate: number
  days: number
}
