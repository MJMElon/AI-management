import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { S, DEPTS, fmtDate } from '../lib/model.js'
import { T } from '../lib/tables.js'
import Flowchart from './Flowchart.jsx'
import Detail from './Detail.jsx'
import CreateForm from './CreateForm.jsx'
import PreviewModal from './PreviewModal.jsx'
import StageInfoModal from './StageInfoModal.jsx'
import SettingsPage from './SettingsPage.jsx'
import Modal from './Modal.jsx'

/* ---- tiny hash router (works on static GitHub Pages) ---- */
function parseHash() {
  const h = (window.location.hash || '').replace(/^#/, '')
  if (h.split('/').filter(Boolean)[0] === 'settings') return { name: 'settings' }
  return { name: 'home' }
}
const go = (path) => { window.location.hash = path }

export default function App({ mode, me, role, setRole, api, sb, userId, onSignOut }) {
  const [props_, setProps] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState(null)       // proposal view popup
  const [preview, setPreview] = useState(null)   // attachment being previewed
  const [sopStage, setSopStage] = useState(null) // SOP popup for a stage
  const [creating, setCreating] = useState(false) // new-proposal popup
  const [accessBusy, setAccessBusy] = useState(false)
  const [users, setUsers] = useState(null)       // access list
  const [accessErr, setAccessErr] = useState(null)
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const reload = useCallback(async () => {
    try { setErr(null); setProps(await api.load()) }
    catch (e) { setErr(e.message || String(e)) }
  }, [api])

  useEffect(() => { setLoading(true); reload().finally(() => setLoading(false)) }, [reload])

  useEffect(() => {
    if (mode !== 'live' || !sb) return
    const ch = sb.channel('vp-realtime')
    ;[T.proposals, T.comments, T.history, T.sessions, T.attachments].forEach((t) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => { reload() }))
    ch.subscribe()
    return () => { sb.removeChannel(ch) }
  }, [mode, sb, reload])

  // load the user list when entering Settings (live)
  useEffect(() => {
    if (route.name !== 'settings' || mode !== 'live') return
    let alive = true
    setUsers(null); setAccessErr(null)
    api.listProfiles().then((u) => { if (alive) setUsers(u) })
      .catch((e) => { if (alive) { setAccessErr(e.message || String(e)); setUsers([]) } })
    return () => { alive = false }
  }, [route.name, mode, api])

  const canAct = (p) => role === 'admin' || S[p.status]?.owner === role
  const canCreate = role === 'operation' || role === 'admin'

  const applyAction = async (p, action, note = '') => { setProps(await api.action(p, action, note, me, role)) }
  const addComment = async (p, body) => { setProps(await api.comment(p, body, me, role)) }
  const toggleTimer = async (p) => { setProps(await api.toggleTimer(p, me)) }
  const createProposal = async (data, files) => {
    const arr = await api.create(data, me, files)
    setProps(arr); setCreating(false)
    if (arr[0]) setSelId(arr[0].id)
  }
  const changeUserRole = async (u, dept) => {
    setAccessBusy(true); setAccessErr(null)
    try {
      if (u.id === userId) await setRole(dept)
      else await api.setProfileRole(u.id, dept)
      setUsers((list) => (list || []).map((x) => (x.id === u.id ? { ...x, department: dept } : x)))
    } catch (e) { setAccessErr(e.message || String(e)) }
    finally { setAccessBusy(false) }
  }

  const countByStage = useMemo(() => {
    const c = {}
    props_.forEach((p) => { const st = S[p.status]; if (st) c[st.stage] = (c[st.stage] || 0) + 1 })
    return c
  }, [props_])

  const homeList = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return props_
    return props_.filter((p) => (p.title + ' ' + p.problem + ' ' + p.cat + ' ' + p.createdBy).toLowerCase().includes(s))
  }, [props_, q])

  const sel = selId ? props_.find((p) => p.id === selId) || null : null

  /* ---------- pages ---------- */
  let page
  if (route.name === 'settings') {
    page = (
      <SettingsPage mode={mode} users={users} userId={userId} role={role} busy={accessBusy} error={accessErr}
        onBack={() => go('/')} onChange={changeUserRole}
        onSwitch={(r) => setRole(r)} />
    )
  } else {
    page = (
      <>
        <Flowchart countByStage={countByStage} activeStage={null}
          onSubmit={() => setCreating(true)} onPickStage={(n) => setSopStage(n)} canCreate={canCreate} />
        <section className="panel">
          <div className="panel-h">
            <h2>Submitted proposals</h2>
            <span className="pill">{homeList.length} total</span>
          </div>
          <div className="filterbar">
            <input className="in" placeholder="Search proposals…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search proposals" />
          </div>
          <div className="plist wide">
            {loading && <div className="empty">Loading…</div>}
            {!loading && homeList.length === 0 &&
              <div className="empty"><div className="big">{props_.length === 0 ? 'No proposals yet' : 'Nothing here'}</div>
                {props_.length === 0 ? 'Submit the first idea to get started.' : 'Try a different search.'}</div>}
            {!loading && homeList.map((p) => {
              const st = S[p.status]
              const nAtt = p.attachments ? p.attachments.length : 0
              return (
                <button key={p.id} className="pcard" onClick={() => setSelId(p.id)}>
                  <div className="pcard-main">
                    <p className="t">{p.title}</p>
                    <div className="meta">
                      <span className={'badge b-' + st.color}><span className="dot"></span>{st.label}</span>
                      {nAtt > 0 && <><span>·</span><span>📎 {nAtt}</span></>}
                    </div>
                  </div>
                  <div className="pcard-side">
                    <span className="viewbtn">View</span>
                    <div className="muted" style={{ textAlign: 'right' }}><div>{p.createdBy}</div><div className="when">{fmtDate(p.createdAt)}</div></div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <header className="topbar">
        <button className="brand brandbtn" onClick={() => go('/')}>
          <span className="mark">Vibe Coding Project Management</span>
        </button>
        <div className="spacer"></div>
        <button className="iconbtn iconbtn-only" onClick={() => go('/settings')} title="Settings" aria-label="Settings">⚙</button>
        {mode === 'live' && <button className="iconbtn" onClick={onSignOut}>Sign out</button>}
      </header>

      <div className="wrap landing">
        {err && <div className="errbar" style={{ margin: '0 0 16px' }}>Couldn’t reach the database: {err}</div>}
        {page}
      </div>

      {/* Proposal view popup */}
      {sel && (
        <Modal wide onClose={() => setSelId(null)}>
          <Detail key={sel.id} p={sel} role={role} me={me} canAct={canAct(sel)}
            onAction={(p, a, note) => applyAction(p, a, note)} onToggleTimer={() => toggleTimer(sel)}
            onComment={(b) => addComment(sel, b)} onPreview={setPreview} />
        </Modal>
      )}

      {/* Attachment preview popup */}
      {preview && <PreviewModal att={preview} getUrl={api.fileUrl} onClose={() => setPreview(null)} />}

      {/* New-proposal popup */}
      {creating && (
        <Modal wide onClose={() => setCreating(false)}>
          {canCreate
            ? <CreateForm onCancel={() => setCreating(false)} onCreate={createProposal} canUpload={mode === 'live'} />
            : <div className="empty"><div className="big">Not available</div>New proposals are submitted by {DEPTS.operation.label}.</div>}
        </Modal>
      )}

      {/* Stage SOP popup */}
      {sopStage && <StageInfoModal startN={sopStage} onClose={() => setSopStage(null)} />}
    </>
  )
}
