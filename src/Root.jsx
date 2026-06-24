import React, { useState, useEffect, useMemo } from 'react'
import { store } from './lib/store.js'
import { getCfg } from './lib/config.js'
import { getClient, makeDemoApi, makeLiveApi } from './lib/api.js'
import { DEPTS, ROLE_USER } from './lib/model.js'
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
    sb.from('profiles').select('id,name,department').eq('id', session.user.id).single()
      .then(({ data }) => { if (alive) setProfile(data || { id: session.user.id, name: session.user.email, department: 'operation' }) })
    return () => { alive = false }
  }, [sb, session])

  const modal = settings && <SettingsModal current={cfg} onClose={() => setSettings(false)} />

  let content
  if (cfg) {
    if (session === undefined || (session && !profile)) {
      content = <div className="loading">Connecting…</div>
    } else if (!session) {
      content = <Auth sb={sb} onOpenSettings={() => setSettings(true)} />
    } else {
      content = (
        <App mode="live" me={profile.name} role={profile.department} api={liveApi} sb={sb}
          onSignOut={() => sb.auth.signOut()} onOpenSettings={() => setSettings(true)} />
      )
    }
  } else {
    content = (
      <App mode="demo" me={ROLE_USER[role]} role={role} setRole={setRole} api={demoApi}
        onOpenSettings={() => setSettings(true)} />
    )
  }

  return <>{content}{modal}</>
}
