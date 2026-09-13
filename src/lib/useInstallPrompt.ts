import { useCallback, useEffect, useState } from 'react'

/**
 * Drives the "install this app" prompt.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`, which we intercept so the app
 * can ask at a sensible moment instead of leaving it to the browser's own
 * mini-infobar. iOS Safari fires nothing and exposes no install API at all, so
 * there the only honest option is to show the manual Share -> Add to Home
 * Screen steps.
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const DISMISS_KEY = 'pump.install.dismissedAt'

/** Ask again after a fortnight rather than never - a dismissal is "not now". */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000

export type InstallMode = 'none' | 'prompt' | 'ios'

export interface InstallState {
  /** 'prompt' = one tap to install, 'ios' = show manual steps, 'none' = hide. */
  mode: InstallMode
  installing: boolean
  install: () => void
  dismiss: () => void
}

function standalone(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      // iOS Safari's own, non-standard flag
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  // Chrome/Firefox on iOS cannot add to the home screen at all, so only offer it in Safari
  return ios && !/crios|fxios|edgios/i.test(ua)
}

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS
  } catch {
    return false
  }
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(standalone)
  const [hidden, setHidden] = useState(snoozed)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // suppress the browser's default banner so ours is the only ask
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // catches an install that happens while this tab is still open
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)')
    if (!mq?.addEventListener) return
    const onChange = (e: MediaQueryListEvent) => setInstalled(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dismiss = useCallback(() => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* refusing storage just means we will ask again next launch */
    }
  }, [])

  const install = useCallback(() => {
    if (!deferred) return
    setInstalling(true)
    void (async () => {
      try {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        // the captured event is single-use, whatever the answer
        setDeferred(null)
        if (outcome === 'dismissed') dismiss()
      } catch {
        setDeferred(null)
      } finally {
        setInstalling(false)
      }
    })()
  }, [deferred, dismiss])

  const mode: InstallMode = installed || hidden ? 'none' : deferred ? 'prompt' : isIosSafari() ? 'ios' : 'none'

  return { mode, installing, install, dismiss }
}
