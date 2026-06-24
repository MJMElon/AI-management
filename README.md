# Vibe Proposals

An internal tool for colleagues to submit vibe-coding project ideas, route them
through approval and IT review, track build time, and ship to go-live.

The flow: **Proposal → Approval → IT Technical Review → Build & Test →
Final Approval → IT Deploy → Go Live**, with two Management approval gates.

## Files

- `index.html` — the whole app in one file (React via CDN, no build step).
  Currently saves data to the browser via localStorage.
- `supabase-schema.sql` — paste into Supabase's SQL Editor to create the
  database (tables + Row Level Security matching the workflow).

## Host on GitHub Pages

1. Create a repo and add `index.html` at the root.
2. **Settings → Pages → Source: Deploy from a branch → `main` / root.**
3. Your site goes live at `https://<you>.github.io/<repo>/` in about a minute.

This static version works per-browser only — fine as a demo. Connect Supabase
(below) to make it a real shared tool.

## Connect Supabase (when you're ready)

1. Create a Supabase project; run `supabase-schema.sql` in the SQL Editor.
2. In **Project Settings → API**, copy your **Project URL** and **anon key**.
3. In `index.html`, add the Supabase client in the `<head>`:

   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/supabase-js/2.45.4/supabase.min.js"></script>
   ```

   then near the top of the script:

   ```js
   const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```

   The anon key is safe to ship in the browser — Row Level Security is what
   actually protects your data.

### Where to swap the code

The prototype keeps all state in React and persists via the small `store`
helper. To go live-shared, replace the local reads/writes with Supabase calls:

| Prototype (now)                     | Supabase (later)                                  |
|-------------------------------------|---------------------------------------------------|
| `seed()` initial data               | `supabase.from('proposals').select()`             |
| `createProposal()`                  | `supabase.from('proposals').insert(...)`          |
| `applyAction()` status change       | `update({status}).eq('id',...)` + insert history  |
| `addComment()`                      | `supabase.from('comments').insert(...)`           |
| timer start/stop                    | insert / update `time_sessions` rows              |
| role switcher (demo)                | `supabase.auth` + the user's `profiles.department` |

The UI, the 6-stage pipeline, the gate logic, and the timer all stay the same —
you're only changing where the data comes from.

## Notes

- The role switcher in the top bar is a **demo aid** so one person can click
  through every department. With Supabase Auth, a user's department comes from
  their `profiles` row instead, and they only see the actions their department
  owns.
- Set each user's department in the `profiles` table after they sign up
  (default is `operation`).
