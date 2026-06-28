import React, { useState } from 'react'
import { fmtSize } from '../lib/model.js'

/* a list of text rows with add / remove */
function RowEditor({ label, rows, setRows, placeholder, multiline }) {
  const update = (i, v) => setRows((r) => r.map((x, idx) => (idx === i ? v : x)))
  const add = () => setRows((r) => [...r, ''])
  const remove = (i) => setRows((r) => (r.length === 1 ? [''] : r.filter((_, idx) => idx !== i)))
  return (
    <div className="full">
      <label className="f">{label}</label>
      {rows.map((val, i) => (
        <div className="rowedit" key={i}>
          {rows.length > 1 && <span className="rowbullet">•</span>}
          {multiline
            ? <textarea className="in" rows={2} value={val} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />
            : <input className="in" value={val} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />}
          {rows.length > 1 && <button type="button" className="filex" onClick={() => remove(i)} aria-label="Remove row">×</button>}
        </div>
      ))}
      <button type="button" className="btn btn-ghost addrow" onClick={add}>+ Add row</button>
    </div>
  )
}

/* a file picker with a dropzone + selected list */
function FileZone({ label, accept, files, setFiles }) {
  const addFiles = (list) => {
    const incoming = Array.from(list)
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.name + p.size))
      return [...prev, ...incoming.filter((x) => !seen.has(x.name + x.size))]
    })
  }
  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))
  return (
    <div className="full">
      <label className="f">{label} <span className="muted">(optional)</span></label>
      <label className="dropzone">
        <input type="file" multiple accept={accept} style={{ display: 'none' }}
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <span>📎 Click to choose files</span>
      </label>
      {files.length > 0 && (
        <div className="filelist">
          {files.map((file, i) => (
            <div className="filerow" key={file.name + file.size + i}>
              <span className="filename">{file.name}</span>
              <span className="muted mono">{fmtSize(file.size)}</span>
              <button type="button" className="filex" onClick={() => removeFile(i)} aria-label="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreateForm({ onCancel, onCreate, canUpload = true }) {
  const [title, setTitle] = useState('')
  const [problems, setProblems] = useState([''])
  const [value, setValue] = useState('')
  const [tools, setTools] = useState([''])
  const [slides, setSlides] = useState([])
  const [others, setOthers] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cleanProblems = problems.map((s) => s.trim()).filter(Boolean)
  const cleanTools = tools.map((s) => s.trim()).filter(Boolean)
  const valid = title.trim() && cleanProblems.length > 0 && value.trim()

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const files = canUpload
        ? [...slides.map((f) => ({ file: f, kind: 'slide' })), ...others.map((f) => ({ file: f, kind: 'file' }))]
        : []
      await onCreate({
        title: title.trim(),
        problem: cleanProblems.join('\n'),
        benefit: value.trim(),
        tools: cleanTools.join('\n'),
      }, files)
    } catch (e) { setError(e.message || String(e)) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <div className="detail-top" style={{ paddingTop: 2 }}>
        <h1 className="form-title">New proposal</h1>
      </div>
      <div className="section" style={{ borderTop: 0, paddingTop: 4 }}>
        <div className="form">
          <div className="full">
            <label className="f">Project title</label>
            <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Specific, short project title" />
          </div>

          <RowEditor label="Problem it solves" rows={problems} setRows={setProblems} multiline placeholder="What's painful today?" />

          <div className="full">
            <label className="f">Value created calculation</label>
            <textarea className="in" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Time saved, cost avoided, errors removed — with the maths." />
          </div>

          <RowEditor label="Planned tools" rows={tools} setRows={setTools} placeholder="e.g. React, Google Sheets API" />

          {canUpload && (
            <>
              <FileZone label="Presentation slides" accept=".ppt,.pptx,.pdf,.key,.odp" files={slides} setFiles={setSlides} />
              <FileZone label="Other attachments" files={others} setFiles={setOthers} />
            </>
          )}
        </div>

        {error && <div className="auth-err" style={{ marginTop: 16 }}>{error}</div>}
        <div className="actions" style={{ marginTop: 18, justifyContent: 'center' }}>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit proposal'}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
