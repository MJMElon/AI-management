import React from 'react'

// Catches any render error so the app shows the problem instead of a blank page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 560, margin: '80px auto', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#4a5852', fontSize: 14 }}>The page hit an error and couldn’t render. Try reloading; if it keeps happening, send this message over:</p>
          <pre style={{ background: '#f6f8f6', border: '1px solid #dfe5e1', borderRadius: 10, padding: 12, fontSize: 12.5, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, background: '#0d3b2e', color: '#eaf3ee', border: 0, borderRadius: 10, padding: '9px 16px', fontWeight: 600, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
