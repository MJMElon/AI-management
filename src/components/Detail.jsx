import React, { useState, useEffect } from 'react'
import { DEPTS, S, STAGES, ACTIONS, now, fmtDate, fmtHrs, fmtClock, fmtSize } from '../lib/model.js'

const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean)

export default function Detail({ p, role, me, canAct, onAction, onToggleTimer, onComment, onPreview }) {
  const st = S[p.status]
  const actions = ACTIONS[p.status] || []
  const problemRows = lines(p.problem)
  const toolRows = lines(p.tools)
  const slides = (p.attachments || []).filter((a) => a.kind === 'slide')
  const otherFiles = (p.attachments || []).filter((a) => a.kind !== 'slide')

  // live ticking for running timer
  const [, tick] = useState(0)
  useEffect(() => {
    if (!p.running) return
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [p.running])

  const loggedSecs = p.sessions.reduce((a, s) => a + (s.end - s.start) / 1000, 0) + (p.running ? (now() - p.running) / 1000 : 0)

  const [draftCmt, setDraftCmt] = useState('')
  const [note, setNote] = useState('')

  return (
    <div>
      <div className="detail-top">
        <div className="eyebrow">Proposal</div>
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
              <>
                <label className="f">Remark / evaluation note <span className="muted">(required to reject or send back)</span></label>
                <textarea className="in" style={{ minHeight: 70, marginBottom: 12 }} value={note}
                  onChange={(e) => setNote(e.target.value)} placeholder="Write your remark for this decision…" />
                <div className="actions">
                  {actions.map((a, i) => (
                    <button key={i} className={'btn btn-' + a.kind} disabled={a.needsComment && !note.trim()}
                      onClick={() => { onAction(p, a, note.trim()); setNote('') }}>{a.label}</button>
                  ))}
                </div>
                <p className="hint">You're acting as {DEPTS[role].label}.</p>
              </>
            )
            : (
              <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                Waiting on <b>{DEPTS[st.owner].label}</b>.
              </p>
            )}
      </div>

      {/* timer (only on build/deploy) */}
      {st.timer && (
        <div className="section">
          <h3>Time tracking</h3>
          <div className={'timer' + (p.running ? '' : ' idle')}>
            <div>
              <div className="clock mono">{fmtClock(loggedSecs)}</div>
              <div className="sub">{p.running ? 'TIMER RUNNING' : 'TOTAL LOGGED'}{p.est ? ` · est. ${p.est}h` : ''}</div>
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
              <span>Actual logged</span>
              <span className="mono">{fmtHrs(loggedSecs)}{p.est ? ` / ${p.est}h` : ''}</span>
            </div>
          </div>}
        </div>
      )}

      {/* details */}
      <div className="section">
        <h3>Details</h3>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Problem it solves</div>
        {problemRows.length > 1
          ? <ul className="bullets">{problemRows.map((x, i) => <li key={i}>{x}</li>)}</ul>
          : <p style={{ margin: '0 0 14px', fontSize: 13.5 }}>{problemRows[0] || '—'}</p>}

        <div className="eyebrow" style={{ marginBottom: 6 }}>Value created calculation</div>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{p.benefit || '—'}</p>

        <div className="eyebrow" style={{ marginBottom: 6 }}>Planned tools</div>
        {toolRows.length > 1
          ? <ul className="bullets" style={{ margin: 0 }}>{toolRows.map((x, i) => <li key={i}>{x}</li>)}</ul>
          : <p style={{ margin: 0, fontSize: 13.5 }}>{toolRows[0] || '—'}</p>}
      </div>

      {/* evaluation results (from Build & Test) */}
      {p.evaluation && (
        <div className="section">
          <h3>Evaluation results</h3>
          <dl className="kv">
            <dt>Usage frequency</dt><dd>{p.evaluation.frequency || '—'}</dd>
            <dt>People using it</dt><dd>{p.evaluation.users ?? '—'}</dd>
            <dt>Department(s)</dt><dd>{p.evaluation.department || '—'}</dd>
            <dt>Remark</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{p.evaluation.remark || '—'}</dd>
          </dl>
        </div>
      )}

      {/* attachments */}
      {(slides.length > 0 || otherFiles.length > 0) && (
        <div className="section">
          <h3>Attachments</h3>
          {slides.length > 0 && <AttachGroup title="Presentation slides" items={slides} onPreview={onPreview} />}
          {otherFiles.length > 0 && <AttachGroup title="Other files" items={otherFiles} onPreview={onPreview} />}
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

function AttachGroup({ title, items, onPreview }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      <div className="filelist">
        {items.map((a) => (
          <button key={a.id} className="filerow filerow-btn" onClick={() => onPreview(a)}>
            <span className="filename">📎 {a.name}</span>
            {a.size != null && <span className="muted mono">{fmtSize(a.size)}</span>}
            <span className="filview">{a.path ? 'View' : 'demo'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
