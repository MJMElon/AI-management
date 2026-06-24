import React, { useState } from 'react'
import { store } from '../lib/store.js'

// Lets a user connect a Supabase project from the browser, without editing
// code or rebuilding. Credentials are stored in this browser only.
export default function SettingsModal({ current, onClose }) {
  const [url, setUrl] = useState(current?.url || '')
  const [key, setKey] = useState(current?.key || '')
  const save = () => {
    if (url.trim() && key.trim()) { store.set('vp_sb_url', url.trim()); store.set('vp_sb_key', key.trim()) }
    window.location.reload()
  }
  const useDemo = () => { store.del('vp_sb_url'); store.del('vp_sb_key'); window.location.reload() }
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>Connect a database</h3>
        <p>Paste your Supabase <b>Project URL</b> and <b>anon key</b> (Project Settings → API). They’re stored in
          this browser only. Use the anon key, never the service_role / secret key — Row Level Security protects your data.</p>
        <div style={{ marginBottom: 12 }}>
          <label className="f">Project URL</label>
          <input className="in" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label className="f">Anon key</label>
          <input className="in" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGci…" />
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={!url.trim() || !key.trim()} onClick={save}>Save &amp; connect</button>
          <button className="btn btn-ghost" onClick={useDemo}>Use demo mode</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        <p className="hint">First run the included <code>supabase-schema.sql</code> in the Supabase SQL Editor to create the tables.</p>
      </div>
    </div>
  )
}
