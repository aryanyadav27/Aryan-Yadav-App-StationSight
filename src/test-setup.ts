/** jsdom has no ResizeObserver; Recharts' ResponsiveContainer requires one. */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

/** Give the container a non-zero box so charts actually render children. */
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 360 })
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 200 })

/** vitest runs with globals:false, so Testing Library's auto-cleanup never
 *  registers - without this every render leaks into the next test's DOM. */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

/** jsdom has no matchMedia; the install prompt uses it to detect standalone mode. */
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
