'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { CASE_STORY, type DecisionId } from './prototypeData';
import styles from './casePrototypeLab.module.css';

const TRACE_CODES = ['17-CC', '33-AE', '55-7D', '81-2F'] as const;

export function SignalTrace() {
  const [selectedSource, setSelectedSource] = useState(2);
  const [decision, setDecision] = useState<DecisionId | ''>('request-evidence');
  const [owner, setOwner] = useState<string>(CASE_STORY.owner);
  const [refreshing, setRefreshing] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const source = CASE_STORY.sources[selectedSource];
  const selectedDecision = CASE_STORY.decisions.find((item) => item.id === decision);

  function runTrace() {
    if (refreshing) return;
    setRefreshing(true);
    setMessage(null);
    window.setTimeout(() => {
      setRefreshing(false);
      setMessage('Trace complete: four source facts still resolve to one named evidence gap.');
    }, 850);
  }

  function recordDecision() {
    if (!selectedDecision) return;
    setRecorded(true);
    setMessage(`${selectedDecision.label} recorded. The trace remains available in the audit history.`);
  }

  return (
    <div className={styles.signalTrace}>
      <div className={styles.signalOuterFrame} aria-hidden="true">
        <span className={styles.signalFrameTop} />
        <span className={styles.signalFrameLeft} />
        <span className={styles.signalFrameRight} />
        <span className={styles.signalFrameBottom} />
      </div>

      <header className={styles.signalHeader}>
        <div className={styles.signalBrand}>
          <Image
            src="/brand/unauth-r1/unauth-r1-lockup-white.svg"
            alt="Unauth"
            width={112}
            height={28}
            priority
          />
          <span>Evidence routing console</span>
        </div>
        <div className={styles.signalHeaderRoute}>
          <span>Cases</span>
          <strong>{CASE_STORY.caseReference.replace('Case #', '')}</strong>
          <span>{CASE_STORY.workspaceNote}</span>
        </div>
        <button type="button" className={styles.signalRun} onClick={runTrace} disabled={refreshing}>
          <RefreshCw aria-hidden="true" size={15} className={refreshing ? styles.spin : undefined} />
          {refreshing ? 'Tracing' : 'Re-run trace'}
        </button>
      </header>

      <main className={styles.signalMain}>
        <header className={styles.signalCaseHeader}>
          <div className={styles.signalCaseCode}>
            <span>CASE</span>
            <strong>81-4150</strong>
          </div>
          <div className={styles.signalTitle}>
            <h1>{CASE_STORY.title}</h1>
            <p>{CASE_STORY.customer} · {CASE_STORY.orderReference} · {CASE_STORY.value}</p>
          </div>
          <div className={styles.signalHeaderStatus}>
            <span>State</span>
            <strong>{CASE_STORY.status}</strong>
          </div>
          <div className={styles.signalHeaderStatus}>
            <span>Owner</span>
            <button
              type="button"
              onClick={() => setOwner((current) => current === 'Unassigned' ? 'Morgan Ellis' : 'Unassigned')}
            >
              {owner}
            </button>
          </div>
        </header>

        <div className={styles.signalGrid}>
          <section className={styles.signalMap} aria-labelledby="signal-map-title">
            <div className={styles.signalSectionLabel}>
              <h2 id="signal-map-title">Evidence trace</h2>
              <span>4 facts · 1 gap · 3 advisory routes</span>
            </div>

            <div className={styles.signalMapCanvas}>
              <div className={styles.signalSources}>
                {CASE_STORY.sources.map((item, index) => (
                  <button
                    type="button"
                    key={item.key}
                    className={styles.signalSource}
                    data-source={item.key}
                    data-selected={selectedSource === index ? '' : undefined}
                    onClick={() => setSelectedSource(index)}
                    aria-pressed={selectedSource === index}
                  >
                    <span>{TRACE_CODES[index]}</span>
                    <strong>{item.label}</strong>
                    <small>{item.time} · {item.state}</small>
                  </button>
                ))}
              </div>

              <svg
                className={styles.signalConnectors}
                viewBox="0 0 620 380"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className={styles.signalBus} d="M 186 49 H 298 V 331" />
                <path className={styles.signalBus} d="M 186 143 H 298" />
                <path className={styles.signalBus} d="M 186 237 H 298" />
                <path className={styles.signalBus} d="M 186 331 H 298" />
                <path className={styles.signalRoute} d="M 298 91 H 430" />
                <path className={styles.signalRoute} d="M 298 190 H 430" />
                <path className={styles.signalRoute} d="M 298 289 H 430" />
                <path
                  className={styles.signalActiveRoute}
                  data-source={CASE_STORY.sources[selectedSource].key}
                  d={`M 186 ${49 + selectedSource * 94} H 298 V ${91 + Math.min(selectedSource, 2) * 99} H 430`}
                />
                <circle cx="298" cy="91" r="4" />
                <circle cx="298" cy="190" r="4" />
                <circle cx="298" cy="289" r="4" />
              </svg>

              <div className={styles.signalRecommendations}>
                {Object.values(CASE_STORY.recommendation).map((item, index) => (
                  <article key={item.label} data-route={index}>
                    <span>{index === 0 ? 'ACTION' : index === 1 ? 'OWNER' : 'RECOVER'}</span>
                    <strong>{item.value}</strong>
                    <small>{item.state}</small>
                  </article>
                ))}
              </div>

              <div className={styles.signalTraceReadout}>
                <span>Selected source</span>
                <strong>{source.label} / {source.provider}</strong>
                <p>{source.fact}</p>
                <dl>
                  <div><dt>Class</dt><dd>Provider fact</dd></div>
                  <div><dt>Observed</dt><dd>{source.time} UTC</dd></div>
                  <div><dt>Route</dt><dd>{selectedSource < 2 ? 'Customer action' : selectedSource === 2 ? 'Responsibility + action' : 'All advisory routes'}</dd></div>
                </dl>
              </div>
            </div>

            <div className={styles.signalGapRail}>
              <span>UNRESOLVED / 01</span>
              <p>{CASE_STORY.gap}</p>
              <button type="button" onClick={() => setDecision('request-evidence')}>Route to decision</button>
            </div>
          </section>

          <aside className={styles.signalDecision} aria-labelledby="signal-decision-title">
            <div className={styles.signalDecisionTitle}>
              <div>
                <span>MERCHANT CONTROL</span>
                <h2 id="signal-decision-title">Decision bay</h2>
              </div>
              <strong>{recorded ? 'RECORDED' : 'ARMED'}</strong>
            </div>

            <div className={styles.signalRule}>
              <span>Matched rule / R-104</span>
              <p>{CASE_STORY.rule}</p>
            </div>

            {recorded && selectedDecision ? (
              <div className={styles.signalRecorded} role="status">
                <span><Check aria-hidden="true" size={19} /></span>
                <p>Decision written to the case timeline</p>
                <strong>{selectedDecision.label}</strong>
                <small>External action: none</small>
                <button type="button" onClick={() => setRecorded(false)}>Return to controls</button>
              </div>
            ) : (
              <>
                <div className={styles.signalDecisionOptions}>
                  {CASE_STORY.decisions.map((item, index) => (
                    <button
                      type="button"
                      key={item.id}
                      data-selected={decision === item.id ? '' : undefined}
                      onClick={() => {
                        setDecision(item.id);
                        setRecorded(false);
                      }}
                    >
                      <span>{`D${index + 1}`}</span>
                      <strong>{item.label}</strong>
                      <i aria-hidden="true" />
                    </button>
                  ))}
                </div>

                <div className={styles.signalDecisionPreview}>
                  <span>Selected routine</span>
                  <strong>{selectedDecision?.label ?? 'No decision selected'}</strong>
                  <p>{selectedDecision?.detail ?? 'Choose the customer action your team intends to record.'}</p>
                </div>

                <button
                  type="button"
                  className={styles.signalCommit}
                  disabled={!decision}
                  onClick={recordDecision}
                >
                  <span>Commit to timeline</span>
                  <b>81-4150</b>
                </button>
              </>
            )}

            <div className={styles.signalBoundary}>
              <span>BOUNDARY CHECK</span>
              <p>Records merchant authorization. Sends no refund, replacement, accusation, or partner claim.</p>
            </div>
          </aside>
        </div>

        <footer className={styles.signalAudit}>
          <div><span>CASE VALUE</span><strong>{CASE_STORY.value}</strong></div>
          <div><span>SOURCE FACTS</span><strong>04 / 04</strong></div>
          <div><span>NAMED GAPS</span><strong>01</strong></div>
          <div><span>DECISION STATE</span><strong>{recorded ? 'MERCHANT-CONFIRMED' : 'PENDING'}</strong></div>
          <p>{CASE_STORY.privacy}</p>
        </footer>
      </main>

      <div className={styles.signalToast} data-visible={message ? '' : undefined} aria-live="polite">
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
