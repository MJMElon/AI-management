import React from 'react'
import Modal from './Modal.jsx'

// The four access levels a user can be assigned.
const ROLES = [
  { key: 'operation', label: 'Operation Team' },
  { key: 'management', label: 'Management Team' },
  { key: 'it', label: 'IT Team' },
  { key: 'admin', label: 'Administrator' },
]

const ROLE_DESC = {
  operation: 'Submit proposals and run Build & Test.',
  management: 'Approve proposals and give final approval after Build & Test.',
  it: 'Do the IT review, then deploy & go-live.',
  admin: 'Full access to every stage and these settings.',
}

export default function AccessModal({ mode, users, userId, role, busy, error, onChange, onSwitch, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h3>User access</h3>
      {mode === 'live' ? (
        <>
          <p>Set what each person can access. Only an Administrator can change other people’s access.</p>
          {error && <div className="auth-err">{error}</div>}
          {!users && <div className="loading" style={{ padding: '20px 0' }}>Loading users…</div>}
          {users && users.length === 0 && <p className="muted">No users yet.</p>}
          {users && users.length > 0 && (
            <div className="userlist">
              {users.map((u) => (
                <div className="userrow" key={u.id}>
                  <div className="usermeta">
                    <div className="useremail">{u.email || u.name || u.id}{u.id === userId && <span className="ume">you</span>}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{ROLE_DESC[u.department] || ''}</div>
                  </div>
                  <select className="in userrole" value={u.department || 'operation'} disabled={busy}
                    onChange={(e) => onChange(u, e.target.value)}>
                    {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p>Demo mode — pick a role to preview what that team can do.</p>
          <div className="rolelist">
            {ROLES.filter((r) => r.key !== 'admin').map((r) => (
              <button key={r.key} className="rolecard" data-on={role === r.key ? '1' : '0'} onClick={() => onSwitch(r.key)}>
                <div className="rolecard-h">{r.label}{role === r.key && <span className="rolecard-now">current</span>}</div>
                <div className="rolecard-d">{ROLE_DESC[r.key]}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
