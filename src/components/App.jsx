import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { store } from '../lib/store.js'
import { DEPTS, S, ACTIONS, STAGES, fmtDate } from '../lib/model.js'
import { T } from '../lib/tables.js'
import Flowchart from './Flowchart.jsx'
import Detail from './Detail.jsx'
import CreateForm from './CreateForm.jsx'
import CommentModal from './CommentModal.jsx'
import Modal from './Modal.jsx'

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
  const [selId, setSelId] = useState(null)      // open detail popup
  const [creating, setCreating] = useState(false) // open submit popup
  const [modal, setModal] = useState(null)       // comment modal {action, propId}
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')    // chip filter
  const [stageFilter, setStageFilter] = useState(null) // flowchart filter (1..6)

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
  const createProposal = async (data, files) => {
    const arr = await api.create(data, me, files)
    setProps(arr); setCreating(false)
  }
  const download = async (att) => { const url = await api.fileUrl(att); if (url) window.open(url, '_blank') }

  const countByStage = useMemo(() => {
    const c = {}
    props_.forEach((p) => { const st = S[p.status]; if (st) c[st.stage] = (c[st.stage] || 0) + 1 })
    return c
  }, [props_])

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
    if (stageFilter) {
      arr = arr.filter((p) => S[p.status]?.stage === stageFilter)
    } else if (filter === 'active') arr = arr.filter((p) => !S[p.status]?.terminal)
    else if (filter === 'closed') arr = arr.filter((p) => S[p.status]?.terminal)
    else if (filter === 'waiting') arr = arr.filter((p) => {
      const acts = ACTIONS[p.status] || []
      return acts.length && (role === 'admin' || S[p.status]?.owner === role)
    })
    const s = q.trim().toLowerCase()
    if (s) arr = arr.filter((p) => (p.title + ' ' + p.problem + ' ' + p.cat + ' ' + p.createdBy).toLowerCase().includes(s))
    return arr
  }, [props_, filter, q, role, stageFilter])

  const pickStage = (n) => { setStageFilter((cur) => (cur === n ? null : n)); setFilter('all') }
  const pickChip = (k) => { setFilter(k); setStageFilter(null) }
  const stageLabel = stageFilter ? (STAGES.find((s) => s.n === stageFilter)?.label) : null

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

      <div className="wrap landing">
        {err && <div className="errbar" style={{ margin: '0 0 16px' }}>Couldn’t reach the database: {err}</div>}

        {/* 1. The clickable process flowchart */}
        <Flowchart
          countByStage={countByStage}
          activeStage={stageFilter}
          onSubmit={() => { if (canCreate) setCreating(true); else setStageFilter(1) }}
          onPickStage={pickStage}
        />

        {/* 2. Add a new proposal */}
        <section className="panel addnew">
          <div>
            <h2>Have an idea?</h2>
            <p className="muted">{canCreate
              ? 'Submit a proposal — describe the problem, the benefit, and attach any mockups.'
              : `New proposals are submitted by ${DEPTS.operation.label}.`}</p>
          </div>
          {canCreate && <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>+ New proposal</button>}
        </section>

        {/* 3. Submitted & approved proposals */}
        <section className="panel">
          <div className="panel-h">
            <h2>Submitted &amp; approved proposals</h2>
            <div className="row" style={{ gap: 14 }}>
              <span className="pill">{counts.total} total</span>
              <span className="pill">{counts.active} active</span>
            </div>
          </div>

          <div className="filterbar">
            <input className="in" placeholder="Search proposals…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search proposals" />
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.k} className="chip" data-on={!stageFilter && filter === f.k ? '1' : '0'} onClick={() => pickChip(f.k)}>{f.label}</button>
              ))}
              {stageFilter && (
                <button className="chip" data-on="1" onClick={() => setStageFilter(null)}>
                  Stage: {stageLabel} ✕
                </button>
              )}
            </div>
          </div>

          <div className="plist wide">
            {loading && <div className="empty">Loading…</div>}
            {!loading && shown.length === 0 &&
              <div className="empty"><div className="big">{props_.length === 0 ? 'No proposals yet' : 'Nothing matches'}</div>
                {props_.length === 0 ? 'Submit the first idea to get started.' : 'Try a different search or filter.'}</div>}
            {!loading && shown.map((p) => {
              const st = S[p.status]
              const nAtt = p.attachments ? p.attachments.length : 0
              return (
                <button key={p.id} className="pcard" onClick={() => setSelId(p.id)}>
                  <div className="pcard-main">
                    <p className="t">{p.title}</p>
                    <div className="meta">
                      <span className={'badge b-' + st.color}><span className="dot"></span>{st.label}</span>
                      <span>·</span><span>{p.prio} priority</span>
                      <span>·</span><span>{p.cat}</span>
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
        </section>
      </div>

      {/* Submit proposal popup */}
      {creating && (
        <Modal wide onClose={() => setCreating(false)}>
          <CreateForm onCancel={() => setCreating(false)} onCreate={createProposal} canUpload={mode === 'live'} />
        </Modal>
      )}

      {/* Proposal detail popup */}
      {sel && (
        <Modal wide onClose={() => setSelId(null)}>
          <Detail key={sel.id} p={sel} role={role} me={me} canAct={canAct(sel)}
            onAction={onAction} onToggleTimer={() => toggleTimer(sel)} onComment={(b) => addComment(sel, b)}
            onDownload={download} />
        </Modal>
      )}

      {/* Required-note popup (rejections / send-backs), stacks above detail */}
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
