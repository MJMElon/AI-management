import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { store } from '../lib/store.js'
import { DEPTS, S, ACTIONS } from '../lib/model.js'
import Detail from './Detail.jsx'
import CreateForm from './CreateForm.jsx'
import CommentModal from './CommentModal.jsx'

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'active', label: 'Active' },
  { k: 'waiting', label: 'Awaiting you' },
  { k: 'closed', label: 'Closed' },
]

export default function App({ mode, me, role, setRole, api, sb, onSignOut, onOpenSettings }) {
  const [props_, setProps] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [selId, setSelId] = useState(() => store.get('vp_sel') || null)
  const [creating, setCreating] = useState(false)
  const [modal, setModal] = useState(null) // {action, propId}
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const reload = useCallback(async () => {
    try { setErr(null); setProps(await api.load()) }
    catch (e) { setErr(e.message || String(e)) }
  }, [api])

  useEffect(() => { setLoading(true); reload().finally(() => setLoading(false)) }, [reload])

  // realtime: any change in the workflow tables refreshes the board
  useEffect(() => {
    if (mode !== 'live' || !sb) return
    const ch = sb.channel('vp-realtime')
    ;['proposals', 'comments', 'status_history', 'time_sessions'].forEach((t) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => { reload() }))
    ch.subscribe()
    return () => { sb.removeChannel(ch) }
  }, [mode, sb, reload])

  useEffect(() => { if (selId) store.set('vp_sel', selId) }, [selId])

  const sel = props_.find((p) => p.id === selId) || null
  const canAct = (p) => role === 'admin' || S[p.status]?.owner === role
  const canCreate = role === 'operation' || role === 'admin'

  const applyAction = async (p, action, note = '') => { setProps(await api.action(p, action, note, me, role)) }
  const onAction = (p, action) => {
    if (action.needsComment) { setModal({ action, propId: p.id }); return }
    applyAction(p, action)
  }
  const addComment = async (p, body) => { setProps(await api.comment(p, body, me, role)) }
  const toggleTimer = async (p) => { setProps(await api.toggleTimer(p, me)) }
  const createProposal = async (data) => {
    const arr = await api.create(data, me)
    setProps(arr); setCreating(false)
    if (arr[0]) setSelId(arr[0].id)
  }

  const counts = useMemo(() => {
    const c = { total: props_.length, active: 0, waiting: 0 }
    props_.forEach((p) => {
      const st = S[p.status]; if (!st) return
      if (!st.terminal) c.active++
      const acts = ACTIONS[p.status] || []
      if (acts.length && (role === 'admin' || st.owner === role)) c.waiting++
    })
    return c
  }, [props_, role])

  const shown = useMemo(() => {
    let arr = props_
    if (filter === 'active') arr = arr.filter((p) => !S[p.status]?.terminal)
    else if (filter === 'closed') arr = arr.filter((p) => S[p.status]?.terminal)
    else if (filter === 'waiting') arr = arr.filter((p) => {
      const acts = ACTIONS[p.status] || []
      return acts.length && (role === 'admin' || S[p.status]?.owner === role)
    })
    const s = q.trim().toLowerCase()
    if (s) arr = arr.filter((p) => (p.title + ' ' + p.problem + ' ' + p.cat + ' ' + p.createdBy).toLowerCase().includes(s))
    return arr
  }, [props_, filter, q, role])

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="mark">Vibe Proposals</span>
          <span className="tag">idea → go-live</span>
        </div>
        <div className={'conn ' + mode}><span className="dot"></span>{mode === 'live' ? 'Live · Supabase' : 'Demo mode'}</div>
        <div className="spacer"></div>
        {mode === 'demo'
          ? (
            <div className="roleswitch" role="tablist" aria-label="Demo role">
              {Object.keys(DEPTS).map((r) => (
                <button key={r} data-on={role === r ? '1' : '0'} onClick={() => setRole(r)}>
                  {DEPTS[r].label.replace(' Dept.', '').replace(' Team', '')}
                </button>
              ))}
            </div>
          )
          : <span className="deptbadge">{DEPTS[role]?.label || role}</span>}
        <div className="who">{mode === 'live' ? 'signed in as' : 'viewing as'}<br /><b>{me}</b></div>
        <button className="iconbtn" onClick={onOpenSettings} title="Connect a database">⚙ Settings</button>
        {mode === 'live' && <button className="iconbtn" onClick={onSignOut}>Sign out</button>}
      </header>

      <div className="wrap">
        {err && <div className="errbar" style={{ margin: '0 0 16px' }}>Couldn’t reach the database: {err}</div>}
        <div className="grid">
          {/* LEFT: list */}
          <aside className="panel">
            <div className="panel-h">
              <h2>Proposals</h2>
              {canCreate &&
                <button className="btn btn-primary" style={{ padding: '7px 12px' }}
                  onClick={() => { setCreating(true); setSelId(null) }}>+ New</button>}
            </div>
            <div className="stats">
              <div className="stat"><div className="n">{counts.total}</div><div className="l">Total</div></div>
              <div className="stat"><div className="n">{counts.active}</div><div className="l">Active</div></div>
              <div className="stat"><div className="n">{counts.waiting}</div><div className="l">Awaiting you</div></div>
            </div>
            <div className="filterbar">
              <input className="in" placeholder="Search proposals…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search proposals" />
              <div className="chips">
                {FILTERS.map((f) => (
                  <button key={f.k} className="chip" data-on={filter === f.k ? '1' : '0'} onClick={() => setFilter(f.k)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="plist">
              {loading && <div className="empty">Loading…</div>}
              {!loading && shown.length === 0 &&
                <div className="empty"><div className="big">{props_.length === 0 ? 'No proposals yet' : 'Nothing matches'}</div>
                  {props_.length === 0 ? 'Submit the first idea to get started.' : 'Try a different search or filter.'}</div>}
              {!loading && shown.map((p) => {
                const st = S[p.status]
                return (
                  <button key={p.id} className="pcard" data-sel={selId === p.id ? '1' : '0'}
                    onClick={() => { setSelId(p.id); setCreating(false) }}>
                    <p className="t">{p.title}</p>
                    <div className="meta">
                      <span className={'badge b-' + st.color}><span className="dot"></span>{st.label}</span>
                      <span>·</span><span>{p.prio}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* RIGHT: detail or create */}
          <main className="panel detail">
            {creating ? <CreateForm onCancel={() => setCreating(false)} onCreate={createProposal} />
              : !sel ? <div className="empty"><div className="big">Pick a proposal</div>Select one on the left to see its progress, actions, and time log.</div>
              : <Detail key={sel.id} p={sel} role={role} me={me} canAct={canAct(sel)}
                  onAction={onAction} onToggleTimer={() => toggleTimer(sel)} onComment={(b) => addComment(sel, b)} />}
          </main>
        </div>
      </div>

      {modal && (() => {
        const p = props_.find((x) => x.id === modal.propId)
        if (!p) return null
        return <CommentModal action={modal.action}
          onClose={() => setModal(null)}
          onSubmit={(note) => { applyAction(p, modal.action, note); setModal(null) }} />
      })()}
    </>
  )
}
