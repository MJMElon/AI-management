import { createClient } from '@supabase/supabase-js'
import { store } from './store.js'
import { S, seed, uid, now, iso } from './model.js'
import { T, BUCKET } from './tables.js'

// One Supabase client per (url, key) pair. Returns null (never throws) so a
// bad URL/key can't blank the page; Root surfaces a clear message instead.
let _client = null
let _clientKey = ''
export function getClient(cfg) {
  if (!cfg) return null
  if (!/^https?:\/\/[^ ]+/i.test(cfg.url)) {
    console.error('Supabase URL looks invalid (must start with https://):', cfg.url)
    return null
  }
  const k = cfg.url + '|' + cfg.key
  if (!_client || _clientKey !== k) {
    try { _client = createClient(cfg.url, cfg.key); _clientKey = k }
    catch (e) { console.error('Supabase client init failed:', e); _client = null; _clientKey = '' }
  }
  return _client
}

/* ============================================================
   Both APIs expose the same async surface so the UI never
   branches on storage:
     load(), create(data, me, files), action(p, a, note, me, role),
     comment(p, body, me, role), toggleTimer(p, me), fileUrl(att)
   Each mutation resolves to the fresh proposals array.
   ============================================================ */

/* ---- demo: localStorage-backed, seeded ---- */
export function makeDemoApi() {
  const read = () => {
    try { const r = store.get('vp_data'); if (r) return JSON.parse(r) } catch (e) { /* ignore */ }
    const s = seed(); store.set('vp_data', JSON.stringify(s)); return s
  }
  const write = (arr) => { store.set('vp_data', JSON.stringify(arr)); return arr }
  return {
    mode: 'demo',
    async load() { return read() },
    async create(data, me, files = []) {
      const p = {
        id: uid(), ...data, est: data.est || 0, status: 'draft', createdBy: me, createdAt: now(),
        comments: [], history: [{ to: 'draft', by: me, at: now(), note: '' }], sessions: [], running: null,
        // demo can't really store files — keep name/size/kind so the UI is honest
        attachments: (files || []).map((x) => ({ id: uid(), name: x.file.name, size: x.file.size, kind: x.kind || 'file', path: null })),
      }
      return write([p, ...read()])
    },
    async action(p, action, note, me, role) {
      return write(read().map((x) => {
        if (x.id !== p.id) return x
        const d = { ...x }
        if (d.running && !(S[action.to]?.timer)) { d.sessions = [...d.sessions, { id: uid(), start: d.running, end: now() }]; d.running = null }
        d.status = action.to
        d.history = [...d.history, { to: action.to, by: me, at: now(), note }]
        if (note) d.comments = [...d.comments, { id: uid(), by: me, role, at: now(), body: note }]
        return d
      }))
    },
    async comment(p, body, me, role) {
      return write(read().map((x) => x.id === p.id
        ? { ...x, comments: [...x.comments, { id: uid(), by: me, role, at: now(), body }] } : x))
    },
    async toggleTimer(p) {
      return write(read().map((x) => {
        if (x.id !== p.id) return x
        const d = { ...x }
        if (d.running) { d.sessions = [...d.sessions, { id: uid(), start: d.running, end: now() }]; d.running = null }
        else d.running = now()
        return d
      }))
    },
    async fileUrl() { return null }, // demo has no real files to download
    async listProfiles() { return [] }, // demo has no real users
    async setProfileRole() {},
  }
}

/* ---- live: Supabase ---- */
function mapProposal(row, names, dept, cBy, hBy, sBy, aBy) {
  const sessions = sBy[row.id] || []
  const open = sessions.find((s) => !s.ended_at)
  return {
    id: row.id, title: row.title, problem: row.problem, benefit: row.benefit,
    est: Number(row.est_hours) || 0, prio: row.priority, cat: row.category, tools: row.tools || '',
    status: row.status,
    createdBy: names[row.created_by] || 'Someone', createdAt: new Date(row.created_at).getTime(),
    comments: (cBy[row.id] || []).map((c) => ({
      id: c.id, by: names[c.author_id] || '?', role: dept[c.author_id] || 'operation',
      at: new Date(c.created_at).getTime(), body: c.body,
    })),
    history: (hBy[row.id] || []).map((h) => ({
      to: h.to_status, by: names[h.actor_id] || '?', at: new Date(h.created_at).getTime(), note: h.note || '',
    })),
    sessions: sessions.filter((s) => s.ended_at).map((s) => ({
      id: s.id, start: new Date(s.started_at).getTime(), end: new Date(s.ended_at).getTime(),
    })),
    running: open ? new Date(open.started_at).getTime() : null,
    attachments: (aBy[row.id] || []).map((a) => ({ id: a.id, name: a.name, size: a.size, path: a.path, kind: a.kind || 'file' })),
  }
}

export function makeLiveApi(sb, user) {
  async function load() {
    const [pr, pp, cm, hi, ss, at] = await Promise.all([
      sb.from(T.profiles).select('id,name,department'),
      sb.from(T.proposals).select('*').order('created_at', { ascending: false }),
      sb.from(T.comments).select('*').order('created_at', { ascending: true }),
      sb.from(T.history).select('*').order('created_at', { ascending: true }),
      sb.from(T.sessions).select('*').order('started_at', { ascending: true }),
      sb.from(T.attachments).select('*').order('created_at', { ascending: true }),
    ])
    const firstErr = [pr, pp, cm, hi, ss, at].map((r) => r.error).find(Boolean)
    if (firstErr) throw firstErr
    const names = {}, dept = {}
    ;(pr.data || []).forEach((p) => { names[p.id] = p.name; dept[p.id] = p.department })
    const group = (rows, k) => { const m = {}; (rows || []).forEach((r) => { (m[r[k]] = m[r[k]] || []).push(r) }); return m }
    return (pp.data || []).map((row) =>
      mapProposal(row, names, dept,
        group(cm.data, 'proposal_id'), group(hi.data, 'proposal_id'),
        group(ss.data, 'proposal_id'), group(at.data, 'proposal_id')))
  }

  async function uploadFiles(proposalId, files) {
    for (const item of files || []) {
      const file = item.file
      const kind = item.kind || 'file'
      const path = `${proposalId}/${uid()}-${file.name}`
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { error: rowErr } = await sb.from(T.attachments).insert({
        proposal_id: proposalId, name: file.name, path, size: file.size, kind, uploaded_by: user.id,
      })
      if (rowErr) throw rowErr
    }
  }

  return {
    mode: 'live', load,
    async create(data, _me, files = []) {
      // est_hours / priority / category are left to their column defaults.
      const { data: rows, error } = await sb.from(T.proposals).insert({
        title: data.title, problem: data.problem, benefit: data.benefit,
        tools: data.tools || null, created_by: user.id, status: 'draft',
      }).select('id').single()
      if (error) throw error
      await sb.from(T.history).insert({ proposal_id: rows.id, to_status: 'draft', actor_id: user.id })
      if (files && files.length) await uploadFiles(rows.id, files)
      return load()
    },
    async action(p, action, note) {
      if (p.running && !(S[action.to]?.timer)) {
        await sb.from(T.sessions).update({ ended_at: iso() }).eq('proposal_id', p.id).is('ended_at', null)
      }
      const { error } = await sb.from(T.proposals).update({ status: action.to, updated_at: iso() }).eq('id', p.id)
      if (error) throw error
      await sb.from(T.history).insert({ proposal_id: p.id, to_status: action.to, actor_id: user.id, note: note || null })
      if (note) await sb.from(T.comments).insert({ proposal_id: p.id, author_id: user.id, body: note })
      return load()
    },
    async comment(p, body) {
      const { error } = await sb.from(T.comments).insert({ proposal_id: p.id, author_id: user.id, body })
      if (error) throw error
      return load()
    },
    async toggleTimer(p) {
      if (p.running) {
        await sb.from(T.sessions).update({ ended_at: iso() }).eq('proposal_id', p.id).is('ended_at', null)
      } else {
        await sb.from(T.sessions).insert({ proposal_id: p.id, user_id: user.id })
      }
      return load()
    },
    async fileUrl(att) {
      if (!att?.path) return null
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(att.path, 3600)
      return data?.signedUrl || null
    },
    async listProfiles() {
      const { data, error } = await sb.from(T.profiles).select('id,name,email,department').order('email', { ascending: true })
      if (error) throw error
      return data || []
    },
    async setProfileRole(id, dept) {
      const { error } = await sb.from(T.profiles).update({ department: dept }).eq('id', id)
      if (error) throw error
    },
  }
}
