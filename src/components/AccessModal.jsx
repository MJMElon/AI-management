import React from 'react'
import Modal from './Modal.jsx'

const ROLES = [
  { key: 'operation', title: 'Normal User',
    desc: 'Submit proposals, run the technical review, build & test, and deploy to go-live.' },
  { key: 'management', title: 'Management Team',
    desc: 'Approve proposals at the first gate, and give final approval after Build & Test.' },
]

export default function AccessModal({ role, onSelect, onClose, busy }) {
  return (
    <Modal onClose={onClose}>
      <h3>User access</h3>
      <p>Pick the role for this account. (Temporary — full per-user access control comes when this merges into the AI system.)</p>
      <div className="rolelist">
        {ROLES.map((r) => (
          <button key={r.key} className="rolecard" data-on={role === r.key ? '1' : '0'}
            disabled={busy} onClick={() => onSelect(r.key)}>
            <div className="rolecard-h">{r.title}{role === r.key && <span className="rolecard-now">current</span>}</div>
            <div className="rolecard-d">{r.desc}</div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
