import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/**
 * Smoke tests over the real dataset: the point is that headline figures reach
 * the screen and the tabs/filter wire up, not to re-test the maths.
 */
/**
 * The sheet is stubbed as unreachable by default, so these assertions run
 * against the bundled snapshot and stay deterministic offline. The live path
 * is covered separately below and in sheet.test.ts.
 */
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

/** The header subtitle, which states the active range - split across text nodes. */
const sub = (c: HTMLElement) => c.querySelector('.sub')!.textContent

const goTo = (label: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }))

describe('App', () => {
  it('opens on the overview with the full period and real totals', () => {
    const { container } = render(<App />)
    expect(screen.getByText('StationSight')).toBeTruthy()
    expect(sub(container)).toBe('1 Jun 2026 – 31 Aug 2026 · 92 days')
    // grand total sale value from the workbook: 3,09,84,027 -> Rs 3.10 Cr
    // (shown twice: the headline tile and the month-table total row)
    expect(screen.getAllByText('₹3.10 Cr').length).toBe(2)
  })

  it('shows both average price figures for each fuel', () => {
    render(<App />)
    expect(screen.getByText('Petrol · board rate')).toBeTruthy()
    expect(screen.getByText('Diesel · board rate')).toBeTruthy()
    // The honest 92-day means. The workbook's GRAND TOTAL row averages the three
    // monthly averages instead and so reports 94.8062 / 87.2492 - we do not copy that.
    expect(screen.getAllByText('₹94.81').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹87.26').length).toBeGreaterThan(0)
  })

  it('breaks down both machines', () => {
    render(<App />)
    goTo('Machines')
    expect(screen.getAllByText(/Machine 1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Machine 2/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nozzle 1').length).toBe(1)
    expect(screen.getAllByText('Nozzle 8').length).toBe(1)
  })

  it('lists all 8 nozzles and drills into one', () => {
    render(<App />)
    goTo('Nozzles')
    for (let i = 1; i <= 8; i++) expect(screen.getAllByText(`Nozzle ${i}`).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Nozzle 3/ }))
    expect(screen.getByText('Share of station')).toBeTruthy()
    expect(screen.getByText(/Opening is the totaliser reading/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /All nozzles/ }))
    expect(screen.getByText('All 8 nozzles combined')).toBeTruthy()
  })

  it('shows the price screen with month-wise rates', () => {
    render(<App />)
    goTo('Prices')
    expect(screen.getByText('Rate movement')).toBeTruthy()
    expect(screen.getByText('Month-wise average rate')).toBeTruthy()
    expect(screen.getAllByText('Jun 2026').length).toBeGreaterThan(0)
  })

  it('narrows every figure when a month preset is picked', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Jun 2026' }))
    expect(sub(container)).toBe('1 Jun 2026 – 30 Jun 2026 · 30 days')
    // June total value from the workbook: 99,81,419 -> Rs 99.81 L
    expect(screen.getAllByText('₹99.81 Lakh').length).toBeGreaterThan(0)
  })

  it('remembers the chosen range across a reload', () => {
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Jul 2026' }))
    first.unmount()

    render(<App />)
    expect(screen.getByText(/1 Jul 2026 – 31 Jul 2026/)).toBeTruthy()
  })

  it('handles a custom range with no data without breaking', () => {
    render(<App />)
    const from = screen.getByLabelText('From date') as HTMLInputElement
    fireEvent.change(from, { target: { value: '2026-08-31' } })
    expect(screen.getByText(/31 Aug 2026 – 31 Aug 2026/)).toBeTruthy()
    expect(screen.getByText(/1 days/)).toBeTruthy()
  })

  it('states plainly that it is read-only and offers no inputs beyond the filter', () => {
    const { container } = render(<App />)
    expect(screen.getByText(/Read-only/)).toBeTruthy()
    const inputs = container.querySelectorAll('input')
    expect(inputs).toHaveLength(2) // the two date fields, nothing else
    expect([...inputs].every((i) => i.type === 'date')).toBe(true)
    expect(container.querySelector('form')).toBeNull()
    expect(within(container).queryAllByRole('textbox')).toHaveLength(0)
  })
})

describe('Google Sheet wiring', () => {
  const csv = {
    readings: `"TITLE Date","N1","N2","N3","N4","N5","N6","N7","N8","Month"
"01-Jun-2026","100","200","300","400","500","600","700","800","Jun-2026"
"02-Jun-2026","110","215","330","445","520","625","760","845","Jun-2026"`,
    rates: `"TITLE Date","MS","HSD","Month"
"01-Jun-2026","Rs. 100.00","Rs. 90.00","Jun-2026"`,
  }

  const stubLive = () =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      new Response(String(input).includes('Nozzle') ? csv.readings : csv.rates, { status: 200 }),
    )

  it('reads the sheet on load and shows the live figures', async () => {
    stubLive()
    const { container } = render(<App />)

    await waitFor(() => expect(screen.getByText(/Live from Google Sheet/)).toBeTruthy())
    // one sale day derived from the two readings
    expect(sub(container)).toBe('1 Jun 2026 – 1 Jun 2026 · 1 days')
    // petrol 10+15+20+25 = 70 L at Rs 100 = 7,000
    // diesel 30+45+60+45 = 180 L at Rs 90 = 16,200  ->  Rs 23,200
    expect(screen.getAllByText('₹23,200').length).toBeGreaterThan(0)
  })

  it('falls back to the bundled snapshot when the sheet is unreachable', async () => {
    render(<App />) // default stub rejects
    await waitFor(() => expect(screen.getByText(/Showing the bundled snapshot/)).toBeTruthy())
    expect(screen.getAllByText('₹3.10 Cr').length).toBe(2)
  })

  it('serves saved sheet data on the next launch while offline', async () => {
    stubLive()
    const first = render(<App />)
    await waitFor(() => expect(screen.getByText(/Live from Google Sheet/)).toBeTruthy())
    first.unmount()

    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const { container } = render(<App />)
    // the cached sheet data is on screen immediately, before the failed refresh resolves
    expect(sub(container)).toBe('1 Jun 2026 – 1 Jun 2026 · 1 days')
    await waitFor(() => expect(screen.getByText(/data saved just now/)).toBeTruthy())
  })

  it('re-reads the sheet when Refresh is tapped', async () => {
    const spy = stubLive()
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Live from Google Sheet/)).toBeTruthy())
    const callsAfterLoad = spy.mock.calls.length

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    })
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsAfterLoad))
  })
})
