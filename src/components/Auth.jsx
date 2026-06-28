import React, { useState } from 'react'

export default function Auth({ sb }) {
  const [mode, setMode] = useState('in') // in | up
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e && e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'in') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw })
        if (error) throw error
      } else {
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name: name || email } } })
        if (error) throw error
        if (!data.session) setMsg('Account created. Check your email to confirm, then sign in.')
      }
    } catch (e2) { setErr(e2.message || String(e2)) }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brandrow"><span className="mark">MJM Group</span></div>
        <h1 style={{ marginBottom: 16 }}>{mode === 'in' ? 'Sign in' : 'Create account'}</h1>
        {err && <div className="auth-err">{err}</div>}
        {msg && <div className="auth-msg">{msg}</div>}
        {mode === 'up' && (
          <div className="auth-field">
            <label className="f">Name</label>
            <input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="auth-field">
          <label className="f">Email</label>
          <input className="in" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="auth-field">
          <label className="f">Password</label>
          <input className="in" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} type="submit" disabled={busy || !email || !pw}>
          {busy ? 'Working…' : (mode === 'in' ? 'Sign in' : 'Create account')}
        </button>
        <div className="auth-toggle">
          {mode === 'in'
            ? <span>No account? <button type="button" onClick={() => { setMode('up'); setErr(''); setMsg('') }}>Create one</button></span>
            : <span>Already have one? <button type="button" onClick={() => { setMode('in'); setErr(''); setMsg('') }}>Sign in</button></span>}
        </div>
      </form>
    </div>
  )
}
