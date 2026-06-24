import React from 'react'
import { STAGES, DEPTS } from '../lib/model.js'

// The signature element: the whole process as a clickable flowchart.
// Step 1 opens the Submit modal; every step filters the list to that stage.
export default function Flowchart({ countByStage, activeStage, onSubmit, onPickStage }) {
  return (
    <section className="panel hero">
      <div className="hero-head">
        <div className="eyebrow">The process</div>
        <h1>From idea to go-live</h1>
        <p className="muted">Click <b>Submit Proposal</b> to start a new one, or click any step to see what’s waiting there.</p>
      </div>
      <div className="flow">
        {STAGES.map((stg) => {
          const isSubmit = stg.n === 1
          const count = countByStage[stg.n] || 0
          return (
            <button
              key={stg.n}
              className="flowstep"
              data-active={activeStage === stg.n ? '1' : '0'}
              data-submit={isSubmit ? '1' : '0'}
              onClick={() => (isSubmit ? onSubmit() : onPickStage(stg.n))}
              title={isSubmit ? 'Submit a new proposal' : `Show proposals at: ${stg.label}`}
            >
              <span className="flownum">{stg.n}</span>
              <span className="flowlbl">{isSubmit ? 'Submit Proposal' : stg.label}</span>
              <span className="flowown">{DEPTS[stg.owner].label}</span>
              {count > 0 && <span className="flowcount">{count}</span>}
              {isSubmit && <span className="flowcta">+ New</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
