import React, { useEffect, useState } from 'react'
import { fmtSize } from '../lib/model.js'

const ext = (name) => (name.split('.').pop() || '').toLowerCase()
const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']

// Pop-out preview of an attachment. Images and PDFs render inline; other
// types (e.g. PowerPoint) offer download since browsers can't preview them.
export default function PreviewModal({ att, getUrl, onClose }) {
  const [url, setUrl] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | none | error

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    if (!att?.path) { setState('none'); return }
    getUrl(att).then((u) => {
      if (!alive) return
      if (u) { setUrl(u); setState('ready') } else { setState('error') }
    }).catch(() => alive && setState('error'))
    return () => { alive = false }
  }, [att, getUrl])

  const e = ext(att.name)
  const isImg = IMG.includes(e)
  const isPdf = e === 'pdf'
  const canInline = isImg || isPdf

  return (
    <div className="modal-bg" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onClose() }}>
      <div className="preview">
        <div className="preview-head">
          <span className="filename" title={att.name}>📎 {att.name}{att.size != null ? ` · ${fmtSize(att.size)}` : ''}</span>
          <div className="row" style={{ gap: 8 }}>
            {url && <a className="btn btn-ghost" style={{ padding: '5px 11px', fontSize: 12.5 }} href={url} target="_blank" rel="noreferrer">Open / Download</a>}
            <button className="modal-x" onClick={onClose} aria-label="Close" style={{ position: 'static' }}>×</button>
          </div>
        </div>
        <div className="preview-body">
          {state === 'loading' && <div className="loading">Loading preview…</div>}
          {state === 'none' && <div className="loading">This is demo data — no real file to preview.</div>}
          {state === 'error' && <div className="loading">Couldn’t load this file.</div>}
          {state === 'ready' && canInline && isImg && <img src={url} alt={att.name} />}
          {state === 'ready' && canInline && isPdf && <iframe title={att.name} src={url} />}
          {state === 'ready' && !canInline && (
            <div className="preview-noinline">
              <div style={{ fontSize: 40 }}>📄</div>
              <p className="muted">No inline preview for <b>.{e}</b> files.</p>
              <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer">Open / Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
