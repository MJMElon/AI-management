import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { S, ACTIONS, STAGES, DEPTS, fmtDate } from '../lib/model.js'
import { T } from '../lib/tables.js'
import Flowchart from './Flowchart.jsx'
import Detail from './Detail.jsx'
import CreateForm from './CreateForm.jsx'
import CommentModal from './CommentModal.jsx'
import PreviewModal from './PreviewModal.jsx'
import AccessModal from './AccessModal.jsx'

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'active', label: 'Active' },
  { k: 'waiting', label: 'Awaiting action' },
  { k: 'closed', label: 'Closed' },
]

/* ---- tiny hash router (works on static GitHub Pages) ---- */
function parseHash() {
  const h = (window.location.hash || '').replace(/^#/, '')
  const parts = h.split('/').filter(Boolean)
  if (parts[0] === 'submit') return { name: 'submit' }
  if (parts[0] === 'p' && parts[1]) return { name: 'detail', id: parts[1] }
  if (parts[0] === 'stage' && parts[1]) return { name: 'stage', n: Number(parts[1]) }
  return { name: 'home' }
}
const go = (path) => { window.location.hash = path }

export default function App({ mode, me, role, setRole, api, sb, onSignOut }) {
  const [props_, setProps] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [modal, setModal] = useState(null) // comment modal {action, propId}
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState(null) // flowchart step filter (1..6)
  const [preview, setPreview] = useState(null) // attachment being previewed
  const [access, setAccess] = useState(false)   // user-access settings modal
  const [accessBusy, setAccessBusy] = useState(false)
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

  const canAct = (p) => role === 'admin' || S[p.status]?.owner === role
  const canCreate = role === 'operation' || role === 'admin'

  const applyAction = async (p, action, note = '') => { setProps(await api.action(p, action, note, me, role)) }
  const onAction = (p, action) => {
    if (action.needsComment) { setModal({ action, propId: p.id }); return }
    applyAction(p, action)
  }
  const addComment = async (p, body) => { setProps(await api.comment(p, body, me, role)) }
  const toggleTimer = async (p) => { setProps(await api.toggleTimer(p, me)) }
  const createProposal = async (data, files) => {
    const arr = await api.create(data, me, files)
    setProps(arr)
    go(arr[0] ? `/p/${arr[0].id}` : '/')
  }

  const countByStage = useMemo(() => {
    const c = {}
    props_.forEach((p) => { const st = S[p.status]; if (st) c[st.stage] = (c[st.stage] || 0) + 1 })
    return c
  }, [props_])

  const filterList = (arr) => {
    const s = q.trim().toLowerCase()
    if (!s) return arr
    return arr.filter((p) => (p.title + ' ' + p.problem + ' ' + p.cat + ' ' + p.createdBy).toLowerCase().includes(s))
  }

  const homeList = useMemo(() => {
    let arr = props_
    if (stageFilter) arr = arr.filter((p) => S[p.status]?.stage === stageFilter)
    else if (filter === 'active') arr = arr.filter((p) => !S[p.status]?.terminal)
    else if (filter === 'closed') arr = arr.filter((p) => S[p.status]?.terminal)
    else if (filter === 'waiting') arr = arr.filter((p) => (ACTIONS[p.status] || []).length > 0)
    return filterList(arr)
  }, [props_, filter, q, stageFilter])

  /* ---------- shared bits ---------- */
  const ListRows = ({ items }) => (
    <div className="plist wide">
      {loading && <div className="empty">Loading…</div>}
      {!loading && items.length === 0 &&
        <div className="empty"><div className="big">{props_.length === 0 ? 'No proposals yet' : 'Nothing here'}</div>
          {props_.length === 0 ? 'Submit the first idea to get started.' : 'Try a different search or filter.'}</div>}
      {!loading && items.map((p) => {
        const st = S[p.status]
        const nAtt = p.attachments ? p.attachments.length : 0
        return (
          <button key={p.id} className="pcard" onClick={() => go(`/p/${p.id}`)}>
            <div className="pcard-main">
              <p className="t">{p.title}</p>
              <div className="meta">
                <span className={'badge b-' + st.color}><span className="dot"></span>{st.label}</span>
                {nAtt > 0 && <><span>·</span><span>📎 {nAtt}</span></>}
              </div>
            </div>
            <div className="pcard-side muted">
              <div>{p.createdBy}</div>
              <div className="when">{fmtDate(p.createdAt)}</div>
            </div>
          </button>
        )
      })}
    </div>
  )

  const flowchart = (
    <Flowchart
      countByStage={countByStage}
      activeStage={stageFilter}
      onSubmit={() => go('/submit')}
      onPickStage={(n) => setStageFilter((cur) => (cur === n ? null : n))}
      canCreate={canCreate}
    />
  )

  /* ---------- pages ---------- */
  let page
  if (route.name === 'submit') {
    page = (
      <section className="panel page">
        <button className="backlink" onClick={() => go('/')}>← Back to process</button>
        {canCreate
          ? <CreateForm onCancel={() => go('/')} onCreate={createProposal} canUpload={mode === 'live'} />
          : <div className="empty"><div className="big">Not available</div>New proposals are submitted by {DEPTS.operation.label}.</div>}
      </section>
    )
  } else if (route.name === 'detail') {
    const sel = props_.find((p) => p.id === route.id) || null
    page = (
      <section className="panel page">
        <button className="backlink" onClick={() => go('/')}>← Back to process</button>
        {sel
          ? <Detail key={sel.id} p={sel} role={role} me={me} canAct={canAct(sel)}
              onAction={onAction} onToggleTimer={() => toggleTimer(sel)} onComment={(b) => addComment(sel, b)}
              onPreview={setPreview} />
          : <div className="empty"><div className="big">{loading ? 'Loading…' : 'Proposal not found'}</div>
              {!loading && 'It may have been removed.'}</div>}
      </section>
    )
  } else {
    // home
    const activeStg = stageFilter ? STAGES.find((s) => s.n === stageFilter) : null
    page = (
      <>
        {flowchart}
        <section className="panel">
          <div className="panel-h">
            <h2>{activeStg ? `${activeStg.icon} ${activeStg.label}` : 'Submitted & approved proposals'}</h2>
            <span className="pill">{homeList.length}{activeStg ? ' here' : ' total'}</span>
          </div>
          <div className="filterbar">
            <input className="in" placeholder="Search proposals…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search proposals" />
            <div className="chips">
              {activeStg && (
                <button className="chip" data-on="1" onClick={() => setStageFilter(null)}>
                  {activeStg.label} ✕
                </button>
              )}
              {FILTERS.map((f) => (
                <button key={f.k} className="chip" data-on={!stageFilter && filter === f.k ? '1' : '0'}
                  onClick={() => { setStageFilter(null); setFilter(f.k) }}>{f.label}</button>
              ))}
            </div>
          </div>
          <ListRows items={homeList} />
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
        {mode === 'live' && <div className="who">signed in as<br /><b>{me}</b> · {DEPTS[role]?.label || role}</div>}
        <button className="iconbtn" onClick={() => setAccess(true)} title="User access">⚙ Settings</button>
        {mode === 'live' && <button className="iconbtn" onClick={onSignOut}>Sign out</button>}
      </header>

      <div className="wrap landing">
        {err && <div className="errbar" style={{ margin: '0 0 16px' }}>Couldn’t reach the database: {err}</div>}
        {page}
      </div>

      {/* Required-note popup (rejections / send-backs) */}
      {modal && (() => {
        const p = props_.find((x) => x.id === modal.propId)
        if (!p) return null
        return <CommentModal action={modal.action}
          onClose={() => setModal(null)}
          onSubmit={(note) => { applyAction(p, modal.action, note); setModal(null) }} />
      })()}

      {/* Attachment preview popup */}
      {preview && <PreviewModal att={preview} getUrl={api.fileUrl} onClose={() => setPreview(null)} />}

      {/* User access settings */}
      {access && (
        <AccessModal role={role} busy={accessBusy} onClose={() => setAccess(false)}
          onSelect={async (r) => {
            if (r === role) { setAccess(false); return }
            setAccessBusy(true)
            try { await setRole(r) } finally { setAccessBusy(false); setAccess(false) }
          }} />
      )}
    </>
  )
}
