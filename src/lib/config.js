import { store } from './store.js'

// Where Supabase credentials come from, in priority order:
//   1. Settings dialog (saved to this browser's localStorage)
//   2. Build-time env vars (.env -> import.meta.env.VITE_*)
// Returns null when nothing is configured, which puts the app in demo mode.
export function getCfg() {
  const url = store.get('vp_sb_url') || import.meta.env.VITE_SUPABASE_URL
  const key = store.get('vp_sb_key') || import.meta.env.VITE_SUPABASE_ANON_KEY
  if (url && key) return { url, key }
  return null
}
