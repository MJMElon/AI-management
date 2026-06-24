# Vibe Proposals

An internal tool for colleagues to submit vibe-coding project ideas, route them
through approval and IT review, track build time, and ship to go-live.

The flow: **Proposal → Approval → IT Technical Review → Build & Test →
Final Approval → IT Deploy → Go Live**, with two Management approval gates.

The app runs in two modes:

- **Demo mode** (default) — data lives in your browser via localStorage, with a
  role switcher so one person can click through every department. Great for a
  quick look or a GitHub Pages demo.
- **Live mode** — connect a Supabase project and it becomes a real shared tool:
  email/password sign-in, per-department permissions, and **real-time updates**
  so everyone sees status changes, comments, and timers as they happen.

Switch between them from **⚙ Settings** in the top bar — no code edits needed.

## A real React app (Vite)

This is a proper **React + Vite** project, not a single HTML file. The web only
ships compiled **UI** — the served `index.html` is just an empty `<div id="root">`
plus the bundle. All proposal **content is fetched from Supabase at runtime**, so
nothing real lives in the page source.

```
index.html              # UI shell only (the mount point + bundle)
src/
  main.jsx              # entry — mounts <Root/>
  styles.css           # all styles
  Root.jsx             # demo-vs-live decision + auth session
  components/          # App, Detail, CreateForm, CommentModal, Auth, SettingsModal
  lib/
    model.js           # statuses, stages, actions, helpers (no data)
    api.js             # makeLiveApi (Supabase) + makeDemoApi (localStorage)
    config.js          # reads VITE_SUPABASE_* / Settings dialog
    store.js           # safe localStorage wrapper
supabase-schema.sql    # run once in the Supabase SQL Editor
.github/workflows/deploy.yml  # build + deploy to GitHub Pages
```

### Develop locally

```bash
npm install
cp .env.example .env     # fill in your Supabase URL + anon key (optional)
npm run dev              # http://localhost:5173
```

Without a `.env` (or Settings entry) the app runs in **demo mode**. Add
credentials to go **live**.

```bash
npm run build            # outputs dist/  (UI only)
npm run preview          # serve the production build
```

## Connect Supabase (go live)

Pick whichever fits — the front-end reads credentials from env vars first, then
the in-app Settings dialog:

**Option A — environment (recommended for a deploy).** Put them in `.env`
(git-ignored) or, for the GitHub Pages build, in repo **Secrets** named
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

**Option B — in the browser.** Open the app, click **⚙ Settings**, paste your
Project URL + anon key, **Save & connect**. Stored in that browser only.

Either way: first run `supabase-schema.sql` in the Supabase SQL Editor to create
the tables, Row Level Security, and the realtime publication.

> ⚠️ Always use the **anon / publishable** key, never the **service_role /
> secret** key. The anon key is safe in the browser because Row Level Security
> protects your data; the secret key bypasses all of it and must never reach the
> front-end.

## Host on GitHub Pages

`.github/workflows/deploy.yml` builds the app and publishes `dist/` on every push
to `main`.

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions** → add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (or skip them to ship a demo-only build).
3. Push to `main`; the site goes live at `https://<you>.github.io/<repo>/`.

### How it works in live mode

| Concern              | Live behaviour                                                 |
|----------------------|---------------------------------------------------------------|
| Initial load         | `proposals` / `comments` / `status_history` / `time_sessions` |
| Create proposal      | `insert` into `proposals` + a `draft` history row             |
| Status change        | `update({status})` + insert history (+ comment if a note)     |
| Comment              | `insert` into `comments`                                       |
| Timer start/stop     | open / close a `time_sessions` row                            |
| Identity & role      | `supabase.auth` + the user's `profiles.department`            |
| Live updates         | Postgres realtime — the board refreshes on any change          |

The UI, the 6-stage pipeline, the gate logic, and the timer are identical to
demo mode — only the data source changes. Both back-ends implement the same small
interface in `src/lib/api.js` (`load`, `create`, `action`, `comment`,
`toggleTimer`), so the components never know or care where the data comes from.

## Notes

- In **demo mode** the role switcher in the top bar lets one person click
  through every department. In **live mode** a user's department comes from their
  `profiles` row, and they only see the actions their department owns.
- Set each user's department in the `profiles` table after they sign up
  (default is `operation`).
- The proposal list has search and quick filters (All / Active / Awaiting you /
  Closed) plus a stats strip, so it stays usable as the board grows.
