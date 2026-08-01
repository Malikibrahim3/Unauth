'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import {
  CASE_STAGES,
  CASE_STORY,
  type CaseStage,
  type DecisionId,
} from './prototypeData';
import styles from './casePrototypeLab.module.css';

const STAGE_COPY: Record<CaseStage, { title: string; body: string; cue: string }> = {
  incoming: {
    title: 'Frame the reported loss',
    body: 'Start with the customer request, matched order, item, parcel and value before interpreting any evidence.',
    cue: 'Case and order are matched.',
  },
  evidence: {
    title: 'Develop each source separately',
    body: 'Provider facts retain their source and timestamp. Missing evidence stays visible rather than being filled with an inference.',
    cue: 'Four source facts, one named gap.',
  },
  recommendation: {
    title: 'Read the rule and the gap',
    body: 'The recommendation is an explainable starting point for the merchant, not an outcome that executes on its own.',
    cue: 'Hold for evidence · medium confidence.',
  },
  decision: {
    title: 'Commit the merchant decision',
    body: 'Choose the customer action your team owns. The confirmation is recorded without sending a refund, replacement or external claim.',
    cue: 'No decision recorded.',
  },
  recovery: {
    title: 'Keep responsibility and recovery separate',
    body: 'A recovery route can be prepared without changing the customer decision or silently assigning responsibility.',
    cue: 'Potential warehouse or carrier route.',
  },
};

export function Safelight() {
  const [stage, setStage] = useState<CaseStage>('evidence');
  const [selectedSource, setSelectedSource] = useState(2);
  const [decision, setDecision] = useState<DecisionId | ''>('request-evidence');
  const [developing, setDeveloping] = useState(false);
  const [developed, setDeveloped] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeSource = CASE_STORY.sources[selectedSource];
  const selectedDecision = CASE_STORY.decisions.find((item) => item.id === decision);
  const stageCopy = STAGE_COPY[stage];

  function developEvidence() {
    if (developing) return;
    setDeveloping(true);
    setDeveloped(false);
    setMessage(null);
    window.setTimeout(() => {
      setDeveloping(false);
      setDeveloped(true);
      setStage('recommendation');
      setMessage('Current facts developed into a refreshed advisory recommendation.');
    }, 900);
  }

  function recordDecision() {
    if (!selectedDecision) return;
    setRecorded(true);
    setStage('recovery');
    setMessage(`${selectedDecision.label} fixed to the case timeline. External action: none.`);
  }

  return (
    <div className={styles.safelight}>
      <header className={styles.safelightHeader}>
        <div className={styles.safelightBrand}>
          <Image
            src="/brand/unauth-r1/unauth-r1-lockup-white.svg"
            alt="Unauth"
            width={108}
            height={28}
            priority
          />
          <span>Case review room</span>
        </div>
        <div className={styles.safelightCaseRef}>
          <span>{CASE_STORY.caseReference}</span>
          <strong>{CASE_STORY.workspaceNote}</strong>
        </div>
        <div className={styles.safelightClock}>
          <span>Evidence window</span>
          <strong>14 DAYS</strong>
        </div>
      </header>

      <nav className={styles.safelightStages} aria-label="Case stages">
        {CASE_STAGES.map((item, index) => (
          <button
            type="button"
            key={item.id}
            data-active={stage === item.id ? '' : undefined}
            onClick={() => setStage(item.id)}
            aria-current={stage === item.id ? 'step' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>

      <main className={styles.safelightMain}>
        <header className={styles.safelightTitle}>
          <div>
            <h1>{CASE_STORY.title}</h1>
            <p>{CASE_STORY.customer} · {CASE_STORY.orderReference} · {CASE_STORY.value}</p>
          </div>
          <dl>
            <div><dt>Status</dt><dd>{CASE_STORY.status}</dd></div>
            <div><dt>Requested action</dt><dd>{CASE_STORY.requestedAction}</dd></div>
            <div><dt>Updated</dt><dd>{CASE_STORY.updated}</dd></div>
          </dl>
        </header>

        <div className={styles.safelightWorkspace}>
          <section className={styles.safelightBench} aria-labelledby="safelight-stage-title">
            <div className={styles.safelightStageIntro}>
              <div>
                <span>Current station</span>
                <h2 id="safelight-stage-title">{stageCopy.title}</h2>
                <p>{stageCopy.body}</p>
              </div>
              <strong>{stageCopy.cue}</strong>
            </div>

            <div className={styles.safelightContactArea}>
              <div className={styles.safelightTestStrips} aria-label="Evidence sources">
                {CASE_STORY.sources.map((source, index) => (
                  <button
                    type="button"
                    key={source.key}
                    data-selected={selectedSource === index ? '' : undefined}
                    data-source={source.key}
                    onClick={() => {
                      setSelectedSource(index);
                      setStage('evidence');
                    }}
                    aria-pressed={selectedSource === index}
                  >
                    <span>{source.time}</span>
                    <strong>{source.label}</strong>
                    <small>{source.state}</small>
                  </button>
                ))}
              </div>

              <article className={styles.safelightPrint}>
                <header>
                  <div>
                    <span>Evidence print / {activeSource.key}</span>
                    <h3>{activeSource.label}</h3>
                  </div>
                  <strong>{activeSource.provider}</strong>
                </header>
                <p className={styles.safelightFact}>{activeSource.fact}</p>
                <dl>
                  <div><dt>Observed</dt><dd>{activeSource.time} UTC</dd></div>
                  <div><dt>Collected</dt><dd>09:21 UTC</dd></div>
                  <div><dt>Kind</dt><dd>Provider source fact</dd></div>
                  <div><dt>Freshness</dt><dd>Current</dd></div>
                </dl>
                <footer>
                  <span>What this proves</span>
                  <p>
                    {activeSource.key === 'commerce'
                      ? 'The order value and recorded fulfilment quantity.'
                      : activeSource.key === 'helpdesk'
                        ? 'The customer report and requested resolution.'
                        : activeSource.key === 'warehouse'
                          ? 'A two-item pick was recorded; the missing parcel weight remains visible.'
                          : 'Delivery was scanned, but parcel contents were not physically proven.'}
                  </p>
                </footer>
              </article>
            </div>

            <div className={styles.safelightRecommendation}>
              <div className={styles.safelightRecommendationHead}>
                <span>Recommendation exposure</span>
                <button type="button" onClick={developEvidence} disabled={developing}>
                  <RefreshCw aria-hidden="true" size={14} className={developing ? styles.spin : undefined} />
                  {developing ? 'Developing' : developed ? 'Develop again' : 'Develop current evidence'}
                </button>
              </div>
              <div className={styles.safelightRecommendationGrid}>
                {Object.values(CASE_STORY.recommendation).map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                    <small>{item.state}</small>
                  </article>
                ))}
              </div>
              <div className={styles.safelightRule}>
                <span>Matched merchant rule</span>
                <p>{CASE_STORY.rule}</p>
              </div>
            </div>
          </section>

          <aside className={styles.safelightTray} aria-labelledby="safelight-decision-title">
            <div className={styles.safelightTrayHandle} aria-hidden="true" />
            <header>
              <span>Merchant-owned control</span>
              <h2 id="safelight-decision-title">Decision tray</h2>
              <p>Nothing leaves Unauth when this record is committed.</p>
            </header>

            {recorded && selectedDecision ? (
              <div className={styles.safelightRecorded} role="status">
                <span><Check aria-hidden="true" size={20} /></span>
                <strong>Decision fixed</strong>
                <p>{selectedDecision.label}</p>
                <small>Recorded in the append-only timeline. External action: none.</small>
                <button type="button" onClick={() => {
                  setRecorded(false);
                  setStage('decision');
                }}>
                  Reopen controls
                </button>
              </div>
            ) : stage !== 'decision' ? (
              <div className={styles.safelightTrayPrompt}>
                <span>{String(CASE_STAGES.findIndex((item) => item.id === stage) + 1).padStart(2, '0')} / 05</span>
                <strong>Review before committing</strong>
                <p>{stageCopy.body}</p>
                <button type="button" onClick={() => setStage('decision')}>Go to merchant decision</button>
              </div>
            ) : (
              <>
                <div className={styles.safelightDecisionOptions}>
                  {CASE_STORY.decisions.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      data-selected={decision === item.id ? '' : undefined}
                      onClick={() => setDecision(item.id)}
                    >
                      <span aria-hidden="true"><i /></span>
                      <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                    </button>
                  ))}
                </div>
                <label className={styles.safelightNote}>
                  <span>Merchant note</span>
                  <textarea placeholder="Optional rationale for the case timeline" />
                </label>
                <button
                  type="button"
                  className={styles.safelightCommit}
                  disabled={!decision}
                  onClick={recordDecision}
                >
                  Fix decision to timeline
                </button>
              </>
            )}

            <section className={styles.safelightGap}>
              <span>Named evidence gap</span>
              <p>{CASE_STORY.gap}</p>
            </section>

            <footer>
              <span>{CASE_STORY.privacy}</span>
            </footer>
          </aside>
        </div>
      </main>

      <div className={styles.safelightToast} data-visible={message ? '' : undefined} aria-live="polite">
        <span>{message}</span>
        {message ? (
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message">
            <X aria-hidden="true" size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
