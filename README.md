# StationSight

A read-only, installable PWA showing sales for Machine 1 and Machine 2 — combined,
per machine, per nozzle, and the average petrol/diesel price over any date range.

Data comes live from the owner's Google Sheet. The app never writes anything back.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
npm test         # 143 tests
```

## Where the numbers come from

The Google Sheet is the single source of truth:

> https://docs.google.com/spreadsheets/d/1SSVHvAYlNGvwwtoJsFV7ydcxjQqhcaQ1BhaIuWyKrzU

Two tabs are read, as CSV, straight from the browser — no backend, no API key:

| Tab | What the app takes from it |
|---|---|
| `Nozzle Readings` | Daily **opening** totaliser per nozzle. Columns 1–8 map to Nozzle 1–8; Nozzles 1–4 are Machine 1, 5–8 are Machine 2. |
| `Daily Rates` | The day's board rate for MS (petrol) and HSD (diesel). |

Everything else is derived in the app, so every figure traces back to a meter reading:

- **litres sold on day _d_** = next day's opening reading − this day's opening reading
- **value** = litres × that day's board rate for that nozzle's fuel
- a day becomes a *sale day* only if it has both a rate and a following reading

**Updating the data**: edit the sheet. The app re-reads it on every launch, when the
phone comes back online, and when you tap **Refresh**. No rebuild, no redeploy.

### Two average prices, deliberately

- **Board rate** — the plain average of the daily rates displayed over the range.
- **Realised** — sale value ÷ litres, so it weights each day by how much actually sold.

They differ slightly, and the gap tells you whether you sold more on cheap or dear days.

> Note: the original workbook's **GRAND TOTAL** row averages the three *monthly*
> averages rather than the 92 daily rates. June has 30 days and July/August 31, so
> that mean-of-means understates the true average by about 0.4 paise/litre. This app
> reports the honest all-days mean, so the all-period figure differs from that row by
> design. Month-by-month the two agree exactly. See `analytics.test.ts`.

## Offline behaviour

The app is offline-first, in three tiers:

1. **Live** — read from the sheet just now.
2. **Saved** — the last successful read, kept in `localStorage`, shown when the sheet
   is unreachable.
3. **Bundled snapshot** — `src/data/dataset.json`, built from the original Excel file,
   so even a cold first launch with no network shows real data.

The status strip under the header always says which of the three you are looking at.

To regenerate the bundled snapshot from the Excel file:

```bash
npm run data   # scripts/build_data.py -> src/data/dataset.json
```

That script re-derives every day and **fails loudly** if its figures stop matching the
workbook's own `Sales Summary` sheet.

## Installing it on a phone

It is a standard PWA: a web manifest, a service worker precaching the whole app, the
BPCL-themed icons, and `display: standalone`.

1. Deploy `dist/` to any static host over **HTTPS** (required for installation).
2. Open the site on the phone.
3. Tap **Install** on the banner the app shows, or use the browser menu.

Once installed it launches full-screen with no browser chrome, and works offline per
the tiers above.

### The install prompt

Anyone who has not installed yet gets a dismissible banner above the tab bar:

- **Android / Chrome / Edge** — the app intercepts `beforeinstallprompt` and suppresses
  the browser's own mini-infobar, so there is exactly one ask. Tapping **Install** opens
  the real system install dialog.
- **iOS Safari** — Apple fires no such event and exposes no install API, so the banner
  shows the manual *Share -> Add to Home Screen* steps instead. Chrome and Firefox on
  iOS cannot install PWAs at all, so the banner stays hidden there.
- **Already installed** — detected via `display-mode: standalone` (and `navigator.standalone`
  on iOS); the banner never appears, including if the app is installed while the tab is open.
- **"Not now"** — snoozed for 14 days rather than suppressed forever.

## Requirements and caveats

- **The sheet must stay shared as "Anyone with the link can view."** If sharing is
  revoked the app says so plainly and falls back to saved/bundled data.
- The sheet's tab names (`Nozzle Readings`, `Daily Rates`) and column order are part of
  the contract. Renaming a tab or reordering the nozzle columns will break the read.
- A totaliser that appears to go backwards (meter reset or typo) is clamped to zero
  litres for that day rather than reported as a negative sale.

## Layout

```
scripts/build_data.py     Excel -> bundled snapshot, with reconciliation checks
src/lib/sheet.ts          Google Sheets CSV fetch + parsing
src/lib/useDataset.ts     live -> saved -> bundled fallback chain
src/lib/useInstallPrompt.ts  install-prompt state (Android event / iOS steps)
src/lib/analytics.ts      all aggregation (pure functions over days x nozzles)
src/lib/format.ts         Indian number/money formatting
src/screens/              Dashboard, Machines, Nozzles, Prices
```

Logos are property of their respective companies (BPCL, HPCL, IndianOil) and are used
here for display only.
