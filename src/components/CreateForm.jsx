import React, { useState } from 'react'
import { fmtSize } from '../lib/model.js'

export default function CreateForm({ onCancel, onCreate, canUpload = true }) {
  const [f, setF] = useState({ title: '', problem: '', benefit: '', est: 8, prio: 'Medium', cat: 'Tooling', tools: '' })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const valid = f.title.trim() && f.problem.trim() && f.benefit.trim()

  const addFiles = (list) => {
    const incoming = Array.from(list)
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => p.name + p.size))
      return [...prev, ...incoming.filter((x) => !seen.has(x.name + x.size))]
    })
  }
  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const submit = async () => { setBusy(true); try { await onCreate(f, files) } finally { setBusy(false) } }

  return (
    <div>
      <div className="detail-top" style={{ paddingTop: 4 }}>
        <div className="eyebrow">New proposal · Operation Dept.</div>
        <h1>Submit a vibe-coding idea</h1>
        <p className="detail-sub">Describe the problem and the win. It starts as a draft you can submit for approval.</p>
      </div>
      <div className="section" style={{ borderTop: 0, paddingTop: 4 }}>
        <div className="form">
          <div className="full">
            <label className="f">Title</label>
            <input className="in" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Auto-fill daily shift report" />
          </div>
          <div className="full">
            <label className="f">Problem it solves</label>
            <textarea className="in" value={f.problem} onChange={(e) => set('problem', e.target.value)} placeholder="What's painful today?" />
          </div>
          <div className="full">
            <label className="f">Expected benefit</label>
            <textarea className="in" value={f.benefit} onChange={(e) => set('benefit', e.target.value)} placeholder="Time saved, errors removed, etc." />
          </div>
          <div>
            <label className="f">Estimated hours</label>
            <input className="in" type="number" min="1" value={f.est} onChange={(e) => set('est', Number(e.target.value))} />
          </div>
          <div>
            <label className="f">Priority</label>
            <select className="in" value={f.prio} onChange={(e) => set('prio', e.target.value)}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </div>
          <div>
            <label className="f">Category</label>
            <select className="in" value={f.cat} onChange={(e) => set('cat', e.target.value)}>
              <option>Tooling</option><option>Reporting</option><option>Operations</option><option>Automation</option>
            </select>
          </div>
          <div>
            <label className="f">Planned tools</label>
            <input className="in" value={f.tools} onChange={(e) => set('tools', e.target.value)} placeholder="React, Sheets API…" />
          </div>

          {canUpload && (
            <div className="full">
              <label className="f">Attachments <span className="muted">(optional — mockups, specs, screenshots)</span></label>
              <label className="dropzone">
                <input type="file" multiple style={{ display: 'none' }}
                  onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                <span>📎 Click to choose files</span>
              </label>
              {files.length > 0 && (
                <div className="filelist">
                  {files.map((file, i) => (
                    <div className="filerow" key={file.name + file.size + i}>
                      <span className="filename">{file.name}</span>
                      <span className="muted mono">{fmtSize(file.size)}</span>
                      <button className="filex" onClick={() => removeFile(i)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit proposal'}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
        {!valid && <p className="hint">Title, problem, and benefit are required.</p>}
      </div>
    </div>
  )
}
