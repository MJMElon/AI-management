import React, { useState } from 'react'
import { fmtSize } from '../lib/model.js'

/* a list of text rows with add / remove — used for Problem and Planned tools */
function RowEditor({ label, hint, rows, setRows, placeholder, addLabel, multiline }) {
  const update = (i, v) => setRows((r) => r.map((x, idx) => (idx === i ? v : x)))
  const add = () => setRows((r) => [...r, ''])
  const remove = (i) => setRows((r) => (r.length === 1 ? [''] : r.filter((_, idx) => idx !== i)))
  return (
    <div className="full">
      <label className="f">{label}</label>
      {hint && <p className="fieldhint">{hint}</p>}
      {rows.map((val, i) => (
        <div className="rowedit" key={i}>
          {rows.length > 1 && <span className="rowbullet">•</span>}
          {multiline
            ? <textarea className="in" rows={2} value={val} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />
            : <input className="in" value={val} placeholder={placeholder} onChange={(e) => update(i, e.target.value)} />}
          {rows.length > 1 && <button type="button" className="filex" onClick={() => remove(i)} aria-label="Remove row">×</button>}
        </div>
      ))}
      <button type="button" className="btn btn-ghost addrow" onClick={add}>+ Add {addLabel}</button>
    </div>
  )
}

/* a file picker with a dropzone + selected list */
function FileZone({ label, hint, accept, files, setFiles }) {
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
      {hint && <p className="fieldhint">{hint}</p>}
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

  const cleanProblems = problems.map((s) => s.trim()).filter(Boolean)
  const cleanTools = tools.map((s) => s.trim()).filter(Boolean)
  const valid = title.trim() && cleanProblems.length > 0 && value.trim()

  const submit = async () => {
    setBusy(true)
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
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="detail-top" style={{ paddingTop: 4 }}>
        <div className="eyebrow">New proposal</div>
        <h1>Submit a vibe-coding idea</h1>
        <p className="detail-sub">Describe the project, the problem, and the value it creates.</p>
      </div>
      <div className="section" style={{ borderTop: 0, paddingTop: 4 }}>
        <div className="form">
          <div className="full">
            <label className="f">Project title</label>
            <p className="fieldhint">Keep it specific but summarized — e.g. “Auto-fill daily shift report”, not “a tool”.</p>
            <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Specific, short project title" />
          </div>

          <RowEditor
            label="Problem it solves"
            hint="One point per row. A single row reads as a paragraph; add rows to make it point form."
            rows={problems} setRows={setProblems} addLabel="point" multiline
            placeholder="What's painful today?"
          />

          <div className="full">
            <label className="f">Value created calculation</label>
            <p className="fieldhint">Quantify the win — e.g. “40 min/day × 6 supervisors × 22 days ≈ 88 hrs/month saved”.</p>
            <textarea className="in" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Time saved, cost avoided, errors removed — with the maths." />
          </div>

          <RowEditor
            label="Planned tools"
            hint="Add a row per tool or technology."
            rows={tools} setRows={setTools} addLabel="tool"
            placeholder="e.g. React, Google Sheets API"
          />

          {canUpload && (
            <>
              <FileZone label="Presentation slides" accept=".ppt,.pptx,.pdf,.key,.odp"
                hint="Pitch deck or slides (PPT, PDF…)." files={slides} setFiles={setSlides} />
              <FileZone label="Other attachments"
                hint="Mockups, screenshots, specs, any supporting files." files={others} setFiles={setOthers} />
            </>
          )}
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit proposal'}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
        {!valid && <p className="hint">Project title, at least one problem point, and the value calculation are required.</p>}
      </div>
    </div>
  )
}
