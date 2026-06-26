import React from 'react'
import { STAGES, DEPTS } from '../lib/model.js'

// Clickable process flowchart. Clicking a step filters the list below to that
// stage; it does NOT open the form. The separate "+ New proposal" button does.
export default function Flowchart({ countByStage, activeStage, onSubmit, onPickStage, canCreate }) {
  return (
    <section className="panel hero">
      <div className="hero-head">
        <h1 className="hero-title">New thoughts? Share to the world.</h1>
        <div className="hero-sub">Let the idea become real</div>
      </div>

      <div className="flow">
        {STAGES.map((stg, i) => {
          const count = countByStage[stg.n] || 0
          return (
            <React.Fragment key={stg.n}>
              {i > 0 && <div className="flowarrow" aria-hidden="true">→</div>}
              <button
                className="flowstep"
                data-active={activeStage === stg.n ? '1' : '0'}
                onClick={() => onPickStage(stg.n)}
                title={`Show proposals at: ${stg.label}`}
              >
                {count > 0 && <span className="flowcount">{count}</span>}
                <span className="flowicon">{stg.icon}</span>
                <span className="flowlbl">{stg.label}</span>
                <span className="flowstepno">{`Step ${String(stg.n).padStart(2, '0')}`}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {canCreate && (
        <button className="newbtn-wide" onClick={onSubmit}>
          <span className="nb-plus">+</span> New proposal
          <span className="nb-hint">Start a new vibe-coding idea</span>
        </button>
      )}
    </section>
  )
}
