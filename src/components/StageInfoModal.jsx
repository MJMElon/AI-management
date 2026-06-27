import React from 'react'
import { DEPTS } from '../lib/model.js'
import Modal from './Modal.jsx'

// SOP explanation for a single process stage.
export default function StageInfoModal({ stage, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{`Step ${String(stage.n).padStart(2, '0')} · ${DEPTS[stage.owner]?.label || ''}`}</div>
      <h3 style={{ marginBottom: 10 }}>{stage.label}</h3>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Standard operating procedure</div>
      <ol className="sop">
        {(stage.sop || []).map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  )
}
