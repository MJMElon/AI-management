import React, { useState } from 'react'
import Modal from './Modal.jsx'

const FREQ = ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Occasionally']

const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean)

// Build & Test evaluation form: shows project details, then asks the
// evaluation questions, then submits for Management's final approval.
export default function EvaluationModal({ p, onSubmit, onClose }) {
  const [frequency, setFrequency] = useState('Daily')
  const [usersCount, setUsersCount] = useState('')
  const [department, setDepartment] = useState('')
  const [remark, setRemark] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const valid = usersCount !== '' && department.trim()
  const problemRows = lines(p.problem)

  const submit = async () => {
    setBusy(true); setError('')
    try {
      await onSubmit({
        frequency,
        users: Number(usersCount) || usersCount,
        department: department.trim(),
        remark: remark.trim(),
      })
    } catch (e) { setError(e.message || String(e)) }
    finally { setBusy(false) }
  }

  return (
    <Modal wide onClose={onClose}>
      <div className="detail-top" style={{ paddingTop: 2 }}>
        <h1 className="form-title">Submit evaluation</h1>
      </div>

      <div className="section" style={{ borderTop: 0, paddingTop: 4 }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Project</div>
        <h3 style={{ margin: '0 0 10px' }}>{p.title}</h3>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Problem it solves</div>
        {problemRows.length > 1
          ? <ul className="bullets">{problemRows.map((x, i) => <li key={i}>{x}</li>)}</ul>
          : <p style={{ margin: 0, fontSize: 13.5 }}>{problemRows[0] || '—'}</p>}
      </div>

      <div className="section">
        <h3>Evaluation results</h3>
        <div className="form">
          <div>
            <label className="f">How often is this system used?</label>
            <select className="in" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQ.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="f">How many people are using it?</label>
            <input className="in" type="number" min="0" value={usersCount} onChange={(e) => setUsersCount(e.target.value)} placeholder="e.g. 8" />
          </div>
          <div className="full">
            <label className="f">Which department(s) will use it?</label>
            <input className="in" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Operations, Warehouse" />
          </div>
          <div className="full">
            <label className="f">Remark</label>
            <textarea className="in" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Notes from testing…" />
          </div>
        </div>

        {error && <div className="auth-err" style={{ marginTop: 16 }}>{error}</div>}
        <div className="actions" style={{ marginTop: 18, justifyContent: 'center' }}>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit for final approval'}</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        {!valid && <p className="hint" style={{ textAlign: 'center' }}>Number of users and department are required.</p>}
      </div>
    </Modal>
  )
}
