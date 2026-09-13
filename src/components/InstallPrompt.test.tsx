import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InstallPrompt } from './InstallPrompt'
import { useInstallPrompt } from '../lib/useInstallPrompt'

/** Mounts the real hook behind the real component, as the app wires them. */
function Harness() {
  return <InstallPrompt {...useInstallPrompt()} />
}

/** Stands in for the browser's beforeinstallprompt event. */
function makeBip(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: string; platform: string }>
  }
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome, platform: 'web' })
  return e
}

const fireBip = async (e: Event) => {
  await act(async () => {
    window.dispatchEvent(e)
  })
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

const REAL_UA = navigator.userAgent

beforeEach(() => localStorage.clear())

afterEach(() => {
  cleanup()
  localStorage.clear()
  setUserAgent(REAL_UA)
  vi.restoreAllMocks()
})

describe('InstallPrompt', () => {
  it('stays hidden until the browser says the app is installable', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('appears once beforeinstallprompt fires', async () => {
    render(<Harness />)
    await fireBip(makeBip())

    expect(screen.getByRole('dialog', { name: /install stationsight/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Install' })).toBeTruthy()
  })

  it('suppresses the browser default banner so ours is the only ask', async () => {
    render(<Harness />)
    const e = makeBip()
    const prevented = vi.spyOn(e, 'preventDefault')
    await fireBip(e)
    expect(prevented).toHaveBeenCalled()
  })

  it('triggers the real install flow when tapped', async () => {
    render(<Harness />)
    const e = makeBip('accepted')
    await fireBip(e)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })

    expect((e as unknown as { prompt: () => void }).prompt).toHaveBeenCalledOnce()
    // the captured event is single-use, so the prompt retires after being used
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('hides for the snooze window after the user declines the browser dialog', async () => {
    render(<Harness />)
    await fireBip(makeBip('dismissed'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(localStorage.getItem('pump.install.dismissedAt')).toBeTruthy()
  })

  it('remembers "not now" across launches, then asks again after a fortnight', async () => {
    render(<Harness />)
    await fireBip(makeBip())
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    // a fresh launch while snoozed stays quiet
    cleanup()
    render(<Harness />)
    await fireBip(makeBip())
    expect(screen.queryByRole('dialog')).toBeNull()

    // ...but a fortnight later it is welcome to ask again
    cleanup()
    localStorage.setItem('pump.install.dismissedAt', String(Date.now() - 15 * 24 * 60 * 60 * 1000))
    render(<Harness />)
    await fireBip(makeBip())
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('disappears for good once the app reports itself installed', async () => {
    render(<Harness />)
    await fireBip(makeBip())
    expect(screen.getByRole('dialog')).toBeTruthy()

    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('never shows when already running standalone', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) =>
        ({
          matches: q.includes('standalone'),
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
    render(<Harness />)
    await fireBip(makeBip())
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  describe('iOS, which fires no install event at all', () => {
    const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1'
    const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile Safari/604.1'

    it('shows manual Add to Home Screen steps in Safari', () => {
      setUserAgent(SAFARI)
      render(<Harness />)

      const dialog = screen.getByRole('dialog')
      expect(dialog.textContent).toContain('Share')
      expect(dialog.textContent).toContain('Add to Home Screen')
      // nothing to tap - iOS exposes no install API
      expect(screen.queryByRole('button', { name: 'Install' })).toBeNull()
    })

    it('stays hidden in Chrome on iOS, which cannot add to the home screen', () => {
      setUserAgent(CHROME_IOS)
      render(<Harness />)
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
