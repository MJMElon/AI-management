import React, { useState } from 'react'
import { STAGES, DEPTS } from '../lib/model.js'
import Modal from './Modal.jsx'

// SOP explanation for a stage, with ‹ › to step through stages in place.
export default function StageInfoModal({ startN, onClose }) {
  const [n, setN] = useState(startN)
  const idx = STAGES.findIndex((s) => s.n === n)
  const stage = STAGES[idx]
  if (!stage) return null
  const hasPrev = idx > 0
  const hasNext = idx < STAGES.length - 1

  return (
    <Modal onClose={onClose}>
      <div className="sop-nav">
        <button className="sop-arrow" disabled={!hasPrev} aria-label="Previous step"
          onClick={() => hasPrev && setN(STAGES[idx - 1].n)}>‹</button>
        <div className="sop-step">{`Step ${String(stage.n).padStart(2, '0')} · ${DEPTS[stage.owner]?.label || ''}`}</div>
        <button className="sop-arrow" disabled={!hasNext} aria-label="Next step"
          onClick={() => hasNext && setN(STAGES[idx + 1].n)}>›</button>
      </div>
      <h3 style={{ marginBottom: 10, textAlign: 'center' }}>{stage.label}</h3>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Standard operating procedure</div>
      <ol className="sop">
        {(stage.sop || []).map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <button className="btn btn-primary sop-gotit" onClick={onClose}>Got it</button>
    </Modal>
  )
}
