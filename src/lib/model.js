// Domain model: departments, statuses, pipeline stages, allowed actions,
// plus formatting helpers and the demo seed. No data lives here in live mode.

export const DEPTS = {
  operation: { label: 'Operation Dept.', color: 'emerald' },
  management: { label: 'Management Team', color: 'amber' },
  it: { label: 'IT Dept.', color: 'sky' },
  admin: { label: 'Administrator', color: 'rose' },
}

// status -> {label, owner dept, badge color, stage index}
export const S = {
  draft:            { label: 'Draft',               owner: 'operation',  color: 'slate',   stage: 1 },
  pending_approval: { label: 'Pending Approval',    owner: 'management', color: 'amber',   stage: 2 },
  needs_revision:   { label: 'Needs Revision',      owner: 'operation',  color: 'slate',   stage: 1 },
  rejected:         { label: 'Rejected',            owner: 'management', color: 'rose',    stage: 2, terminal: true },
  it_review:        { label: 'IT Technical Review', owner: 'it',         color: 'sky',     stage: 3 },
  building:         { label: 'Build & Test',        owner: 'operation',  color: 'indigo',  stage: 4, timer: true },
  final_review:     { label: 'Final Review',        owner: 'management', color: 'amber',   stage: 4 },
  needs_rework:     { label: 'Needs Rework',        owner: 'operation',  color: 'slate',   stage: 4 },
  final_rejected:   { label: 'Final Rejected',      owner: 'management', color: 'rose',    stage: 4, terminal: true },
  ready_to_deploy:  { label: 'Ready to Deploy',     owner: 'it',         color: 'sky',     stage: 5 },
  deploying:        { label: 'Deploying',           owner: 'it',         color: 'sky',     stage: 5, timer: true },
  live:             { label: 'Live',                owner: 'it',         color: 'emerald', stage: 6, terminal: true },
}

export const STAGES = [
  { n: 1, label: 'Proposal', owner: 'operation' },
  { n: 2, label: 'Approval', owner: 'management' },
  { n: 3, label: 'IT Review', owner: 'it' },
  { n: 4, label: 'Build & Test', owner: 'operation' },
  { n: 5, label: 'Deploy', owner: 'it' },
  { n: 6, label: 'Go Live', owner: 'it' },
]

// actions available, keyed by status. needsComment => modal asks for a note.
export const ACTIONS = {
  draft:            [{ to: 'pending_approval', label: 'Submit for approval', kind: 'primary' }],
  needs_revision:   [{ to: 'pending_approval', label: 'Resubmit', kind: 'primary' }],
  pending_approval: [
    { to: 'it_review',      label: 'Approve', kind: 'amber' },
    { to: 'needs_revision', label: 'Request changes', kind: 'ghost', needsComment: true },
    { to: 'rejected',       label: 'Reject', kind: 'rose', needsComment: true },
  ],
  it_review: [
    { to: 'building',       label: 'Clear for build', kind: 'primary' },
    { to: 'needs_revision', label: 'Send back with concerns', kind: 'ghost', needsComment: true },
  ],
  building:     [{ to: 'final_review', label: 'Submit for final approval', kind: 'primary' }],
  needs_rework: [{ to: 'building', label: 'Resume build', kind: 'primary' }],
  final_review: [
    { to: 'ready_to_deploy', label: 'Approve for deploy', kind: 'amber' },
    { to: 'needs_rework',    label: 'Send back to build', kind: 'ghost', needsComment: true },
    { to: 'final_rejected',  label: 'Reject', kind: 'rose', needsComment: true },
  ],
  ready_to_deploy: [{ to: 'deploying', label: 'Start deployment', kind: 'primary' }],
  deploying:       [{ to: 'live', label: 'Mark as live', kind: 'primary' }],
  live:            [],
  rejected:        [],
  final_rejected:  [],
}

export const ROLE_USER = { operation: 'Maya Ops', management: 'Grace Mgr', it: 'Ivan IT', admin: 'Admin User' }

export const uid = () => Math.random().toString(36).slice(2, 9)
export const now = () => Date.now()
export const iso = () => new Date().toISOString()
export const fmtDate = (t) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtHrs = (secs) => { const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60); return `${h}h ${String(m).padStart(2, '0')}m` }
export const fmtClock = (secs) => {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
export const fmtSize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Demo seed — only used when no database is connected.
export function seed() {
  const t = now()
  const day = 86400000
  const mk = (title, problem, benefit, est, prio, cat, tools, status, extra = {}) => ({
    id: uid(), title, problem, benefit, est, prio, cat, tools, status,
    createdBy: 'Maya Ops', createdAt: t - 3 * day,
    comments: extra.comments || [], history: extra.history || [{ to: status, by: 'Maya Ops', at: t - 3 * day, note: '' }],
    sessions: extra.sessions || [], running: null,
  })
  return [
    mk('Auto-fill daily shift report',
      'Supervisors retype the same shift numbers into 3 systems every evening.',
      'Saves ~40 min/day per supervisor and removes copy-paste errors.',
      12, 'High', 'Reporting', 'React form + Sheets API', 'pending_approval',
      { history: [{ to: 'draft', by: 'Maya Ops', at: t - 3 * day, note: '' }, { to: 'pending_approval', by: 'Maya Ops', at: t - 2 * day, note: '' }] }),
    mk('Warehouse label QR generator',
      'Labels are made by hand in Word, slow and inconsistent.',
      'Bulk-generate scannable labels in seconds.',
      8, 'Medium', 'Tooling', 'HTML + qrcode.js', 'building',
      { history: [
        { to: 'draft', by: 'Omar Ops', at: t - 6 * day, note: '' },
        { to: 'pending_approval', by: 'Omar Ops', at: t - 5 * day, note: '' },
        { to: 'it_review', by: 'Grace Mgr', at: t - 5 * day, note: 'Looks worthwhile.' },
        { to: 'building', by: 'Ivan IT', at: t - 4 * day, note: 'No security concerns.' },
      ], sessions: [{ id: uid(), start: t - 2 * day, end: t - 2 * day + 5400000 }] }),
    mk('Returns intake checklist app',
      'Paper checklists get lost; no audit trail for returned goods.',
      'Digital checklist with timestamps and photo capture.',
      16, 'High', 'Operations', 'React + IndexedDB', 'final_review',
      { history: [
        { to: 'draft', by: 'Priya Ops', at: t - 9 * day, note: '' },
        { to: 'pending_approval', by: 'Priya Ops', at: t - 8 * day, note: '' },
        { to: 'it_review', by: 'Daniel Mgr', at: t - 8 * day, note: 'Approved.' },
        { to: 'building', by: 'Lena IT', at: t - 7 * day, note: 'Cleared.' },
        { to: 'final_review', by: 'Priya Ops', at: t - 1 * day, note: 'Built and tested, ready for review.' },
      ], sessions: [{ id: uid(), start: t - 5 * day, end: t - 5 * day + 7 * 3600000 }, { id: uid(), start: t - 3 * day, end: t - 3 * day + 5 * 3600000 }] }),
  ]
}
