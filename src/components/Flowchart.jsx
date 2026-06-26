import React from 'react'
import { STAGES, DEPTS } from '../lib/model.js'

// The signature element: the whole process as a polished, clickable flowchart.
// Step 1 ("Submit Proposal") and the block below open the submit page;
// every other step opens that stage's page.
export default function Flowchart({ countByStage, activeStage, onSubmit, onPickStage, canCreate }) {
  return (
    <section className="panel hero">
      <div className="hero-head">
        <div className="eyebrow">The process</div>
        <h1>From idea to go-live</h1>
        <p className="muted">Six steps, two approval gates. Click any step to see what’s waiting there.</p>
      </div>

      <div className="flow">
        {STAGES.map((stg, i) => {
          const isSubmit = stg.n === 1
          const count = countByStage[stg.n] || 0
          return (
            <React.Fragment key={stg.n}>
              {i > 0 && <div className="flowarrow" aria-hidden="true">→</div>}
              <button
                className="flowstep"
                data-active={activeStage === stg.n ? '1' : '0'}
                data-submit={isSubmit ? '1' : '0'}
                onClick={() => (isSubmit ? onSubmit() : onPickStage(stg.n))}
                title={isSubmit ? 'Submit a new proposal' : `Show proposals at: ${stg.label}`}
              >
                {count > 0 && <span className="flowcount">{count}</span>}
                <span className="flowicon">{stg.icon}</span>
                <span className="flowlbl">{isSubmit ? 'Submit Proposal' : stg.label}</span>
                <span className="flowown">{DEPTS[stg.owner].label}</span>
                <span className="flowstepno">Step {stg.n}</span>
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {canCreate && (
        <div className="flow-actions">
          <button className="btn btn-primary newbtn" onClick={onSubmit}>+ New proposal</button>
          <span className="muted flow-actions-hint">Start a new vibe-coding proposal</span>
        </div>
      )}
    </section>
  )
}
