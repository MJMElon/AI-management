import React, { useState, useEffect } from 'react'
import { DEPTS, S, STAGES, ACTIONS, now, fmtDate, fmtHrs, fmtClock, fmtSize } from '../lib/model.js'

export default function Detail({ p, role, me, canAct, onAction, onToggleTimer, onComment, onDownload }) {
  const st = S[p.status]
  const actions = ACTIONS[p.status] || []

  // live ticking for running timer
  const [, tick] = useState(0)
  useEffect(() => {
    if (!p.running) return
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [p.running])

  const loggedSecs = p.sessions.reduce((a, s) => a + (s.end - s.start) / 1000, 0) + (p.running ? (now() - p.running) / 1000 : 0)

  const [draftCmt, setDraftCmt] = useState('')

  return (
    <div>
      <div className="detail-top">
        <div className="eyebrow">{p.cat} · {p.prio} priority</div>
        <h1>{p.title}</h1>
        <div className="detail-sub">
          <span className={'badge b-' + st.color}><span className="dot"></span>{st.label}</span>
          <span>·</span><span>by {p.createdBy}</span>
          <span>·</span><span>{fmtDate(p.createdAt)}</span>
        </div>
      </div>

      {/* pipeline */}
      <div className="pipe">
        {STAGES.map((stg) => {
          const cur = st.stage
          let state = stg.n < cur ? 'done' : stg.n === cur ? 'active' : 'todo'
          if (st.terminal && p.status !== 'live' && stg.n === cur) state = 'active'
          const flag = (p.status === 'rejected' || p.status === 'final_rejected' || p.status === 'needs_revision' || p.status === 'needs_rework') && stg.n === cur ? '1' : '0'
          return (
            <div className="step" key={stg.n} data-state={state} data-flag={flag}>
              <div className="num">{state === 'done' ? '✓' : stg.n}</div>
              <div className="lbl">{stg.label}</div>
              <div className="own">{DEPTS[stg.owner].label}</div>
            </div>
          )
        })}
      </div>

      {st.terminal && p.status !== 'live' &&
        <div className="banner" style={{ marginTop: 6 }}>This proposal was {st.label.toLowerCase()} and is closed.</div>}

      {/* actions */}
      <div className="section">
        <h3>What happens next</h3>
        {actions.length === 0
          ? <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>{p.status === 'live' ? 'Shipped. Nothing left to do. 🎉' : 'This proposal is closed.'}</p>
          : canAct
            ? (
              <div className="actions">
                {actions.map((a, i) => (
                  <button key={i} className={'btn btn-' + a.kind} onClick={() => onAction(p, a)}>{a.label}</button>
                ))}
              </div>
            )
            : (
              <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                Waiting on <b>{DEPTS[st.owner].label}</b>.
              </p>
            )}
        {canAct && actions.length > 0 && <p className="hint">You're acting as {DEPTS[role].label}. Rejecting or sending back asks for a comment.</p>}
      </div>

      {/* timer (only on build/deploy) */}
      {st.timer && (
        <div className="section">
          <h3>Time tracking</h3>
          <div className={'timer' + (p.running ? '' : ' idle')}>
            <div>
              <div className="clock mono">{fmtClock(loggedSecs)}</div>
              <div className="sub">{p.running ? 'TIMER RUNNING' : 'TOTAL LOGGED'} · est. {p.est}h</div>
            </div>
            <div className="spacer" style={{ flex: 1 }}></div>
            {canAct && <button className={'btn ' + (p.running ? 'btn-rose' : 'btn-primary')} onClick={onToggleTimer}>
              {p.running ? 'Stop timer' : 'Start timer'}</button>}
          </div>
          {p.sessions.length > 0 && <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Sessions</div>
            {p.sessions.map((s) => (
              <div className="logrow" key={s.id}>
                <span>{fmtDate(s.start)}</span>
                <span className="mono">{fmtHrs((s.end - s.start) / 1000)}</span>
              </div>
            ))}
            <div className="logrow" style={{ fontWeight: 600 }}>
              <span>Actual vs estimate</span>
              <span className="mono">{fmtHrs(loggedSecs)} / {p.est}h</span>
            </div>
          </div>}
        </div>
      )}

      {/* details */}
      <div className="section">
        <h3>Details</h3>
        <dl className="kv">
          <dt>Problem</dt><dd>{p.problem}</dd>
          <dt>Expected benefit</dt><dd>{p.benefit}</dd>
          <dt>Estimated effort</dt><dd>{p.est} hours</dd>
          <dt>Planned tools</dt><dd>{p.tools || '—'}</dd>
        </dl>
      </div>

      {/* attachments */}
      {p.attachments && p.attachments.length > 0 && (
        <div className="section">
          <h3>Attachments</h3>
          <div className="filelist">
            {p.attachments.map((a) => (
              <div className="filerow" key={a.id}>
                <span className="filename">📎 {a.name}</span>
                {a.size != null && <span className="muted mono">{fmtSize(a.size)}</span>}
                {a.path
                  ? <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12.5 }} onClick={() => onDownload(a)}>Download</button>
                  : <span className="muted" style={{ fontSize: 12 }}>demo</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* comments */}
      <div className="section">
        <h3>Discussion</h3>
        <div className="thread">
          {p.comments.length === 0 && <p className="muted" style={{ fontSize: 13, margin: 0 }}>No comments yet.</p>}
          {p.comments.map((c) => (
            <div className="cmt" key={c.id}>
              <div className="h"><b>{c.by}</b> · {DEPTS[c.role]?.label} · {fmtDate(c.at)}</div>
              <div className="body">{c.body}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input className="in" style={{ flex: 1 }} placeholder="Add a comment…" value={draftCmt}
            onChange={(e) => setDraftCmt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && draftCmt.trim()) { onComment(draftCmt.trim()); setDraftCmt('') } }} />
          <button className="btn" disabled={!draftCmt.trim()} onClick={() => { onComment(draftCmt.trim()); setDraftCmt('') }}>Post</button>
        </div>
      </div>

      {/* history */}
      <div className="section">
        <h3>History</h3>
        <ul className="hist">
          {[...p.history].reverse().map((h, i) => (
            <li key={i}>
              <span className="tick"></span>
              <span>moved to <b>{S[h.to]?.label || h.to}</b> by {h.by} <span className="when">· {fmtDate(h.at)}</span>
                {h.note && <div className="muted" style={{ marginTop: 2 }}>“{h.note}”</div>}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
