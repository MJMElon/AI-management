import React from 'react'
import { STAGES, DEPTS } from '../lib/model.js'

const svg = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

// Designed line symbols (no emoji, no boxes), keyed by stage number.
const ICONS = {
  1: svg(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>),
  2: svg(<><circle cx="12" cy="12" r="9" /><path d="M8.4 12.3l2.4 2.4 4.8-5.1" /></>),
  3: svg(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.4-3.4" /></>),
  4: svg(<><path d="M9 7.5 5.5 12 9 16.5" /><path d="M15 7.5 18.5 12 15 16.5" /></>),
  5: svg(<><path d="M12 3c2.8 1.9 4 5.4 4 8.5L14 14h-4l-2-2.5C8 8.4 9.2 4.9 12 3z" /><circle cx="12" cy="9" r="1.3" /><path d="M9.5 15l-2 4 3-1.2M14.5 15l2 4-3-1.2" /></>),
}

// The whole process as ONE block. Clicking a step turns that step dark and
// filters the list below; the wide button under it opens the submit form.
export default function Flowchart({ countByStage, activeStage, onSubmit, onPickStage, canCreate }) {
  return (
    <section className="panel hero">
      <div className="hero-head">
        <h1 className="hero-title">New thoughts? Share to the world.</h1>
      </div>

      <div className="flow">
        {STAGES.map((stg) => {
          const count = countByStage[stg.n] || 0
          return (
            <button
              key={stg.n}
              className="flowstep"
              data-active={activeStage === stg.n ? '1' : '0'}
              onClick={() => onPickStage(stg.n)}
              title={`Show proposals at: ${stg.label}`}
            >
              {count > 0 && <span className="flowcount">{count}</span>}
              <span className="flowicon">{ICONS[stg.n]}</span>
              <span className="flowlbl">{stg.label}</span>
              <span className="flowown">{DEPTS[stg.owner].label}</span>
            </button>
          )
        })}
      </div>

      {canCreate && (
        <button className="newbtn-wide" onClick={onSubmit}>
          <span className="nb-plus">+</span> New proposal
        </button>
      )}
    </section>
  )
}
