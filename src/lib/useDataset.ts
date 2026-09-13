import { useCallback, useEffect, useRef, useState } from 'react'
import seed from '../data/dataset.json'
import { fetchDataset } from './sheet'
import type { Dataset } from './types'

const CACHE_KEY = 'pump.dataset.v1'

export type Origin = 'live' | 'cache' | 'seed'

export interface DatasetState {
  data: Dataset
  origin: Origin
  /** When the data now on screen was pulled from the sheet. */
  fetchedAt: number | null
  loading: boolean
  error: string | null
}

interface Cached {
  fetchedAt: number
  data: Dataset
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached
    if (parsed?.data?.days?.length) return parsed
  } catch {
    /* unreadable cache is the same as no cache */
  }
  return null
}

function writeCache(entry: Cached) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    /* quota or private mode - the app still works, it just will not remember */
  }
}

/**
 * Data comes from the Google Sheet. Until that lands - and whenever the phone
 * is offline - the app shows the last copy it saved, falling back to the
 * snapshot bundled at build time so a cold first launch is never empty.
 */
export function useDataset(): DatasetState & { refresh: () => void } {
  const cached = useRef(readCache()).current

  const [state, setState] = useState<DatasetState>({
    data: (cached?.data ?? (seed as Dataset)) as Dataset,
    origin: cached ? 'cache' : 'seed',
    fetchedAt: cached?.fetchedAt ?? null,
    loading: true,
    error: null,
  })

  const inflight = useRef<AbortController | null>(null)

  const load = useCallback(() => {
    inflight.current?.abort()
    const ctrl = new AbortController()
    inflight.current = ctrl

    setState((s) => ({ ...s, loading: true, error: null }))

    fetchDataset(ctrl.signal)
      .then((data) => {
        const fetchedAt = Date.now()
        writeCache({ fetchedAt, data })
        setState({ data, origin: 'live', fetchedAt, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return
        // keep whatever is already on screen; just say why it is not fresh
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Could not reach the sheet.',
        }))
      })
  }, [])

  useEffect(() => {
    load()
    return () => inflight.current?.abort()
  }, [load])

  // a phone coming back online should catch up on its own
  useEffect(() => {
    const onOnline = () => load()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [load])

  return { ...state, refresh: load }
}
