import React, { useState, useEffect, useRef } from 'react'

export default function CommentModal({ action, onClose, onSubmit }) {
  const [note, setNote] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current && ref.current.focus() }, [])
  const reject = action.to === 'rejected' || action.to === 'final_rejected'
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h3>{action.label}</h3>
        <p>{reject ? 'Add a reason — the submitter will see this.' : 'Tell the submitter what to change.'}</p>
        <textarea ref={ref} className="in" style={{ minHeight: 90 }} value={note}
          onChange={(e) => setNote(e.target.value)} placeholder="Your comment…" />
        <div className="actions" style={{ marginTop: 16 }}>
          <button className={'btn ' + (reject ? 'btn-rose' : 'btn-primary')} disabled={!note.trim()} onClick={() => onSubmit(note.trim())}>
            {action.label}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
