import type { InstallState } from '../lib/useInstallPrompt'

const icon = `${import.meta.env.BASE_URL}icon-192.png`

/** Sits above the tab bar, only for people who have not installed the app yet. */
export function InstallPrompt({ mode, installing, install, dismiss }: InstallState) {
  if (mode === 'none') return null

  return (
    <div className="install" role="dialog" aria-label="Install StationSight">
      <img className="install-icon" src={icon} alt="" />

      <div className="install-body">
        <strong>Install StationSight</strong>
        {mode === 'prompt' ? (
          <span>Add it to your home screen for full-screen access, even offline.</span>
        ) : (
          <span>
            Tap <ShareIcon /> <b>Share</b>, then <b>Add to Home Screen</b>.
          </span>
        )}
      </div>

      {mode === 'prompt' && (
        <button className="install-go" onClick={install} disabled={installing}>
          {installing ? 'Installing…' : 'Install'}
        </button>
      )}

      <button className="install-x" onClick={dismiss} aria-label="Not now">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/** iOS share glyph, so the instruction points at something recognisable. */
const ShareIcon = () => (
  <svg
    className="share-glyph"
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v13M8 7l4-4 4 4" />
    <path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
  </svg>
)
