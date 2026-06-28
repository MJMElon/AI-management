import React, { useState, useEffect, useMemo } from 'react'
import { store } from './lib/store.js'
import { getCfg } from './lib/config.js'
import { getClient, makeDemoApi, makeLiveApi } from './lib/api.js'
import { ROLE_USER } from './lib/model.js'
import { T } from './lib/tables.js'
import App from './components/App.jsx'
import Auth from './components/Auth.jsx'
import SettingsModal from './components/SettingsModal.jsx'

// Decides demo vs live and owns the auth session. The web ships only this
// UI shell — proposal content is fetched from Supabase at runtime.
export default function Root() {
  const [cfg] = useState(getCfg)
  const [settings, setSettings] = useState(false)
  const [role, setRole] = useState(() => store.get('vp_role') || 'operation')
  const [session, setSession] = useState(undefined) // undefined = checking
  const [profile, setProfile] = useState(null)

  const sb = useMemo(() => getClient(cfg), [cfg])
  const demoApi = useMemo(() => makeDemoApi(), [])
  const liveApi = useMemo(() => (sb && session) ? makeLiveApi(sb, session.user) : null, [sb, session])

  useEffect(() => { store.set('vp_role', role) }, [role])

  // auth session lifecycle
  useEffect(() => {
    if (!sb) { setSession(null); return }
    sb.auth.getSession().then(({ data }) => setSession(data.session || null))
    const { data: listener } = sb.auth.onAuthStateChange((_e, s) => setSession(s || null))
    return () => listener.subscription.unsubscribe()
  }, [sb])

  // load profile (department doubles as role)
  useEffect(() => {
    if (!sb || !session) { setProfile(null); return }
    let alive = true
    sb.from(T.profiles).select('id,name,department').eq('id', session.user.id).single()
      .then(({ data }) => { if (alive) setProfile(data || { id: session.user.id, name: session.user.email, department: 'operation' }) })
    return () => { alive = false }
  }, [sb, session])

  // Change the current account's role. Live: persist to profiles (RLS allows
  // editing your own row). Demo: flip local state.
  const changeRole = async (dept) => {
    if (sb && session) {
      const { error } = await sb.from(T.profiles).update({ department: dept }).eq('id', session.user.id)
      if (error) throw error
      setProfile((p) => (p ? { ...p, department: dept } : p))
    } else {
      setRole(dept)
    }
  }

  const modal = settings && <SettingsModal current={cfg} onClose={() => setSettings(false)} />

  let content
  if (cfg) {
    if (!sb) {
      content = (
        <div className="loading" style={{ maxWidth: 520, margin: '80px auto', lineHeight: 1.6 }}>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, color: '#16201c' }}>Configuration problem</h1>
          <p>Couldn’t start the database connection. The site’s Supabase <b>URL</b> looks invalid —
          check the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> repository secrets.
          A common mistake is <b>swapping</b> the two values (URL in the key field, or key in the URL field).</p>
          <p className="muted">The URL must start with <code>https://</code> and end in <code>.supabase.co</code>.</p>
        </div>
      )
    } else if (session === undefined || (session && !profile)) {
      content = <div className="loading">Connecting…</div>
    } else if (!session) {
      content = <Auth sb={sb} />
    } else {
      content = (
        <App mode="live" me={profile.name} role={profile.department} setRole={changeRole} api={liveApi} sb={sb}
          userId={session.user.id} onSignOut={() => sb.auth.signOut()} />
      )
    }
  } else {
    content = (
      <App mode="demo" me={ROLE_USER[role]} role={role} setRole={changeRole} api={demoApi} />
    )
  }

  return <>{content}{modal}</>
}
