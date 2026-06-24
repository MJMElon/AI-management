import React, { useEffect } from 'react'

// Generic popup wrapper. Closes on backdrop click or Escape.
export default function Modal({ onClose, wide, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (wide ? ' modal-wide' : '')}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}
