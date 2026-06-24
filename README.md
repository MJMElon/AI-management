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

## Files

- `index.html` — the whole app in one file (React via CDN, no build step).
  Talks to Supabase when configured, falls back to localStorage otherwise.
- `supabase-schema.sql` — paste into Supabase's SQL Editor to create the
  database (tables + Row Level Security + realtime, matching the workflow).

## Host on GitHub Pages

1. Create a repo and add `index.html` at the root.
2. **Settings → Pages → Source: Deploy from a branch → `main` / root.**
3. Your site goes live at `https://<you>.github.io/<repo>/` in about a minute.

This static version works per-browser only — fine as a demo. Connect Supabase
(below) to make it a real shared tool.

## Connect Supabase (go live)

The Supabase client is already wired into `index.html` — you just give it your
project's credentials:

1. Create a Supabase project; run `supabase-schema.sql` in the SQL Editor. This
   creates the tables, Row Level Security, and the realtime publication.
2. In **Project Settings → API**, copy your **Project URL** and **anon key**.
3. Open the app, click **⚙ Settings**, paste both, and **Save & connect**.

That's it. The credentials are stored in your browser only; the anon key is safe
to use client-side — Row Level Security is what actually protects your data.

> Prefer to hardcode it (e.g. for a shared deploy)? Set `window.SUPABASE_URL`
> and `window.SUPABASE_ANON_KEY` in a `<script>` before the app loads, or use the
> Settings dialog once per browser.

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
demo mode — only the data source changes.

## Notes

- In **demo mode** the role switcher in the top bar lets one person click
  through every department. In **live mode** a user's department comes from their
  `profiles` row, and they only see the actions their department owns.
- Set each user's department in the `profiles` table after they sign up
  (default is `operation`).
- The proposal list has search and quick filters (All / Active / Awaiting you /
  Closed) plus a stats strip, so it stays usable as the board grows.
