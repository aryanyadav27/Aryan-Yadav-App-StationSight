import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { daysIn, monthsIn } from './lib/analytics'
import { longDate } from './lib/format'
import { useDataset } from './lib/useDataset'
import { useInstallPrompt } from './lib/useInstallPrompt'
import type { DateRange } from './lib/types'
import { InstallPrompt } from './components/InstallPrompt'
import { RangeFilter, buildPresets, type Preset } from './components/RangeFilter'
import { Dashboard } from './screens/Dashboard'
import { Machines } from './screens/Machines'
import { Nozzles } from './screens/Nozzles'
import { Prices } from './screens/Prices'

const STORE_KEY = 'pump.range'

type TabId = 'dashboard' | 'machines' | 'nozzles' | 'prices'

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: <path d="M3 13h4v8H3zM10 3h4v18h-4zM17 9h4v12h-4z" /> },
  { id: 'machines', label: 'Machines', icon: <path d="M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M4 11h10M17 8h3v11a2 2 0 01-4 0v-8h4" /> },
  { id: 'nozzles', label: 'Nozzles', icon: <path d="M3 21h12M5 21V6a3 3 0 013-3h2a3 3 0 013 3v15M17 7l3 3v7a2 2 0 01-4 0v-4" /> },
  { id: 'prices', label: 'Prices', icon: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" /> },
] satisfies { id: TabId; label: string; icon: ReactElement }[]

const asset = (f: string) => `${import.meta.env.BASE_URL}${f}`

const OMCS = [
  { src: 'bpcl-logo.svg', alt: 'Bharat Petroleum' },
  { src: 'hpcl-logo.svg', alt: 'Hindustan Petroleum' },
  { src: 'iocl-logo.webp', alt: 'Indian Oil' },
]

/** The user's last-used filter is the only thing this app ever writes down. */
function loadRange(): DateRange | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const r = JSON.parse(raw) as DateRange
      if (r.from && r.to && r.from <= r.to) return r
    }
  } catch {
    /* private mode or cleared storage - fall through to the default */
  }
  return null
}

export default function App() {
  const { data: ds, origin, fetchedAt, loading, error, refresh } = useDataset()
  const installer = useInstallPrompt()
  const [tab, setTab] = useState<TabId>('dashboard')
  const [range, setRange] = useState<DateRange | null>(loadRange)

  const bounds: DateRange = useMemo(() => ({ from: ds.from, to: ds.to }), [ds.from, ds.to])

  /** Any stored or chosen range is clamped to the days the sheet actually holds. */
  const clamp = useMemo(
    () =>
      (r: DateRange): DateRange => {
        const from = r.from < bounds.from ? bounds.from : r.from > bounds.to ? bounds.to : r.from
        const to = r.to > bounds.to ? bounds.to : r.to < bounds.from ? bounds.from : r.to
        return from > to ? { from: to, to: from } : { from, to }
      },
    [bounds],
  )

  const effective = useMemo(() => (range ? clamp(range) : bounds), [range, clamp, bounds])

  const presets = useMemo(() => buildPresets(ds.from, ds.to, monthsIn(ds)), [ds])
  const days = useMemo(() => daysIn(ds, effective), [ds, effective])

  const activeId = useMemo(() => {
    const hit = presets.find((p) => {
      const d = daysIn(ds, p.range)
      return d.length === days.length && d[0]?.date === days[0]?.date
    })
    return hit?.id ?? null
  }, [presets, days, ds])

  useEffect(() => {
    if (!range) return
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(range))
    } catch {
      /* not being able to remember the filter is not worth breaking the app over */
    }
  }, [range])

  const onPreset = (p: Preset) => setRange(clamp(p.range))
  const onRange = (r: DateRange) => setRange(clamp(r))

  return (
    <div className={`app${installer.mode === 'none' ? '' : ' has-install'}`}>
      <header className="header">
        <div className="brand">
          <div className="omc-logos">
            {OMCS.map((o) => (
              <img key={o.src} src={asset(o.src)} alt={o.alt} title={o.alt} />
            ))}
          </div>
          <div className="titles">
            <h1>StationSight</h1>
            <div className="sub">
              {days.length
                ? `${longDate(days[0].date)} – ${longDate(days[days.length - 1].date)} · ${days.length} days`
                : 'No days in this range'}
            </div>
          </div>
        </div>

        <SyncBar origin={origin} fetchedAt={fetchedAt} loading={loading} error={error} onRefresh={refresh} />

        <RangeFilter
          presets={presets}
          activeId={activeId}
          range={effective}
          bounds={bounds}
          onPreset={onPreset}
          onRange={onRange}
        />
      </header>

      <main>
        {tab === 'dashboard' && <Dashboard ds={ds} days={days} />}
        {tab === 'machines' && <Machines ds={ds} days={days} />}
        {tab === 'nozzles' && <Nozzles key={effective.from + effective.to} ds={ds} days={days} />}
        {tab === 'prices' && <Prices ds={ds} days={days} />}

        <div className="foot-note">
          <div className="omc-logos faded">
            {OMCS.map((o) => (
              <img key={o.src} src={asset(o.src)} alt="" />
            ))}
          </div>
          <p className="note" style={{ marginTop: 0 }}>
            Read-only · {ds.days.length} days on record
          </p>
          <p className="made-with">Made with ❤️ by Aryan Yadav and Team</p>
        </div>
      </main>

      <InstallPrompt {...installer} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Says plainly where the numbers came from and how stale they are. */
function SyncBar({
  origin,
  fetchedAt,
  loading,
  error,
  onRefresh,
}: {
  origin: 'live' | 'cache' | 'seed'
  fetchedAt: number | null
  loading: boolean
  error: string | null
  onRefresh: () => void
}) {
  const tone = loading ? 'busy' : error ? 'stale' : 'live'
  const label = loading
    ? 'Syncing with Google Sheet…'
    : error
      ? `${error} Showing ${origin === 'seed' ? 'the bundled snapshot' : `data saved ${ago(fetchedAt)}`}.`
      : `Live from Google Sheet · updated ${ago(fetchedAt)}`

  return (
    <div className={`sync ${tone}`}>
      <span className="sync-dot" />
      <span className="sync-label">{label}</span>
      <button onClick={onRefresh} disabled={loading}>
        {loading ? 'Syncing' : 'Refresh'}
      </button>
    </div>
  )
}

function ago(at: number | null): string {
  if (!at) return 'just now'
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return `${Math.round(h / 24)} d ago`
}
