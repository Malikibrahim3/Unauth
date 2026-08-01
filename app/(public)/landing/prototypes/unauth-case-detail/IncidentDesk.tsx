'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { CASE_STORY, type DecisionId } from './prototypeData';
import styles from './casePrototypeLab.module.css';

export function IncidentDesk() {
  const [selectedSource, setSelectedSource] = useState(2);
  const [decision, setDecision] = useState<DecisionId | ''>('');
  const [rationale, setRationale] = useState('');
  const [owner, setOwner] = useState<string>(CASE_STORY.owner);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState('09:20');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeSource = CASE_STORY.sources[selectedSource];
  const selectedDecision = CASE_STORY.decisions.find((item) => item.id === decision);

  function refreshRecommendations() {
    if (refreshing) return;
    setRefreshing(true);
    setMessage(null);
    window.setTimeout(() => {
      setRefreshing(false);
      setRefreshedAt('just now');
      setMessage('Recommendations refreshed from the four current source facts.');
    }, 700);
  }

  function recordDecision() {
    if (!selectedDecision) return;
    setRecorded(true);
    setMessage(`${selectedDecision.label} recorded in the case timeline. No external action was sent.`);
  }

  return (
    <div className={styles.incidentDesk}>
      <header className={styles.incidentUtility}>
        <div className={styles.incidentBrand}>
          <Image
            src="/brand/unauth-r1/unauth-r1-lockup-graphite.svg"
            alt="Unauth"
            width={108}
            height={28}
            priority
          />
          <span>Operations</span>
        </div>
        <label className={styles.incidentSearch}>
          <Search aria-hidden="true" size={15} />
          <span className={styles.srOnly}>Search</span>
          <input placeholder="Search cases, customers or orders" />
          <kbd>⌘ K</kbd>
        </label>
        <div className={styles.incidentUtilityRight}>
          <span className={styles.incidentFiction}>{CASE_STORY.workspaceNote}</span>
          <button
            type="button"
            className={styles.incidentAvatar}
            onClick={() => setCustomerOpen(true)}
            aria-label="Open operator details"
          >
            ME
          </button>
        </div>
      </header>

      <div className={styles.incidentBody}>
        <aside className={styles.incidentSidebar} aria-label="Product navigation">
          <div className={styles.incidentWorkspace}>
            <span>A&amp;A</span>
            <div>
              <strong>{CASE_STORY.merchant}</strong>
              <small>Live operations</small>
            </div>
          </div>
          <nav>
            <p>Workspace</p>
            <span>Overview</span>
            <span>Work <b>9</b></span>
            <span className={styles.incidentNavActive}>Cases <b>9</b></span>
            <span>Losses</span>
            <span>Recovery <b>3</b></span>
            <p>Control</p>
            <span>Rules</span>
            <span>Flows</span>
            <span>Reports</span>
            <span>Integrations</span>
          </nav>
          <div className={styles.incidentSidebarFoot}>
            <span>Source health</span>
            <strong><i /> 4 of 4 current</strong>
          </div>
        </aside>

        <main className={styles.incidentMain}>
          <div className={styles.incidentCrumb}>
            <span>Cases</span>
            <ChevronRight aria-hidden="true" size={13} />
            <strong>{CASE_STORY.caseReference}</strong>
          </div>

          <header className={styles.incidentCaseHeader}>
            <div>
              <div className={styles.incidentTitleLine}>
                <h1>{CASE_STORY.title}</h1>
                <span>{CASE_STORY.status}</span>
              </div>
              <p>
                {CASE_STORY.customer} · {CASE_STORY.orderReference} · {CASE_STORY.requestedAction}
              </p>
            </div>
            <div className={styles.incidentHeaderFacts}>
              <dl>
                <div><dt>Value at issue</dt><dd>{CASE_STORY.value}</dd></div>
                <div><dt>Owner</dt><dd>{owner}</dd></div>
                <div><dt>Updated</dt><dd>{CASE_STORY.updated}</dd></div>
              </dl>
              <button type="button" onClick={() => setCustomerOpen(true)}>
                Customer profile <ArrowUpRight aria-hidden="true" size={14} />
              </button>
            </div>
          </header>

          <div className={styles.incidentStatusStrip}>
            <strong>Evidence window open</strong>
            <span>{CASE_STORY.evidenceWindow}</span>
            <i />
            <span>4 source facts reconciled</span>
            <i />
            <span>1 named gap</span>
            <button type="button" onClick={refreshRecommendations} disabled={refreshing}>
              <RefreshCw aria-hidden="true" size={13} className={refreshing ? styles.spin : undefined} />
              {refreshing ? 'Refreshing' : `Refreshed ${refreshedAt}`}
            </button>
          </div>

          <div className={styles.incidentWorkspaceGrid}>
            <section className={styles.incidentEvidence} aria-labelledby="incident-evidence-title">
              <div className={styles.incidentSectionHead}>
                <div>
                  <h2 id="incident-evidence-title">Evidence timeline</h2>
                  <p>Provider facts stay separate from merchant findings and system inference.</p>
                </div>
                <span>Source fact</span>
              </div>

              <div className={styles.incidentTimeline}>
                {CASE_STORY.sources.map((source, index) => (
                  <button
                    type="button"
                    key={source.key}
                    className={styles.incidentSourceRow}
                    data-selected={selectedSource === index ? '' : undefined}
                    onClick={() => setSelectedSource(index)}
                    aria-pressed={selectedSource === index}
                  >
                    <span className={styles.incidentSourceTime}>{source.time}</span>
                    <span className={styles.incidentSourceMark} data-source={source.key}>
                      {source.short}
                    </span>
                    <span className={styles.incidentSourceCopy}>
                      <strong>{source.label}</strong>
                      <small>{source.provider}</small>
                      <span>{source.fact}</span>
                    </span>
                    <em>{source.state}</em>
                    <ChevronRight aria-hidden="true" size={15} />
                  </button>
                ))}
              </div>

              <div className={styles.incidentSourceDetail} aria-live="polite">
                <div>
                  <span>Selected record</span>
                  <strong>{activeSource.label} · {activeSource.provider}</strong>
                </div>
                <p>{activeSource.fact}</p>
                <dl>
                  <div><dt>Occurred</dt><dd>{activeSource.time} UTC</dd></div>
                  <div><dt>Collected</dt><dd>09:21 UTC</dd></div>
                  <div><dt>Classification</dt><dd>Provider source fact</dd></div>
                </dl>
              </div>

              <div className={styles.incidentGap}>
                <span>Evidence gap</span>
                <p>{CASE_STORY.gap}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDecision('request-evidence');
                    setMessage('Request-more-evidence action prepared in the decision column.');
                  }}
                >
                  Prepare request
                </button>
              </div>
            </section>

            <section className={styles.incidentAssessment} aria-labelledby="incident-assessment-title">
              <div className={styles.incidentSectionHead}>
                <div>
                  <h2 id="incident-assessment-title">Decision support</h2>
                  <p>Three recommendations. One merchant decision.</p>
                </div>
                <span>Advisory</span>
              </div>

              <div className={styles.incidentRule}>
                <span>Matched merchant rule</span>
                <p>{CASE_STORY.rule}</p>
              </div>

              <div className={styles.incidentRecommendationList}>
                {Object.values(CASE_STORY.recommendation).map((item, index) => (
                  <article key={item.label} className={styles.incidentRecommendation}>
                    <div>
                      <span>{item.label}</span>
                      <em>{item.state}</em>
                    </div>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                    <small>{index === 0 ? 'Rule + source facts' : index === 1 ? 'Source facts only' : 'Conditional handoff'}</small>
                  </article>
                ))}
              </div>

              <footer className={styles.incidentAssessmentFoot}>
                <span>System boundary</span>
                <p>Unauth does not approve, deny, refund, accuse, or submit a partner claim.</p>
              </footer>
            </section>

            <aside className={styles.incidentDecision} aria-labelledby="incident-decision-title">
              <div className={styles.incidentDecisionHead}>
                <div>
                  <h2 id="incident-decision-title">Merchant decision</h2>
                  <p>Your team owns the customer outcome.</p>
                </div>
                <span>Not recorded</span>
              </div>

              <div className={styles.incidentOwner}>
                <span>Case owner</span>
                <strong>{owner}</strong>
                <button
                  type="button"
                  onClick={() => setOwner((current) => current === 'Unassigned' ? 'Morgan Ellis' : 'Unassigned')}
                >
                  {owner === 'Unassigned' ? 'Assign to me' : 'Unassign'}
                </button>
              </div>

              {recorded && selectedDecision ? (
                <div className={styles.incidentRecorded} role="status">
                  <span><Check aria-hidden="true" size={16} /></span>
                  <strong>Decision recorded</strong>
                  <p>{selectedDecision.label}</p>
                  <small>Added to the append-only case timeline. External action: none.</small>
                  <button type="button" onClick={() => setRecorded(false)}>Review another option</button>
                </div>
              ) : (
                <>
                  <div className={styles.incidentChoiceList}>
                    {CASE_STORY.decisions.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        data-selected={decision === item.id ? '' : undefined}
                        onClick={() => {
                          setDecision(item.id);
                          setRecorded(false);
                        }}
                      >
                        <span aria-hidden="true"><i /></span>
                        <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                      </button>
                    ))}
                  </div>

                  <label className={styles.incidentRationale}>
                    <span>Decision rationale {decision === 'deny' ? '· required' : '· optional'}</span>
                    <textarea
                      value={rationale}
                      onChange={(event) => setRationale(event.target.value)}
                      placeholder="Add the facts that informed this decision"
                    />
                  </label>

                  <button
                    type="button"
                    className={styles.incidentCommit}
                    disabled={!decision || (decision === 'deny' && rationale.trim().length < 5)}
                    onClick={recordDecision}
                  >
                    Review and record
                  </button>
                  <p className={styles.incidentDecisionNote}>
                    Records authorization only. No refund, replacement, or partner claim is sent.
                  </p>
                </>
              )}
            </aside>
          </div>
        </main>
      </div>

      {customerOpen ? (
        <>
          <button
            type="button"
            className={styles.incidentBackdrop}
            aria-label="Close customer profile"
            onClick={() => setCustomerOpen(false)}
          />
          <aside className={styles.incidentCustomerDrawer} aria-label="Customer profile">
            <header>
              <div>
                <span>Customer context</span>
                <h2>{CASE_STORY.customer}</h2>
              </div>
              <button type="button" onClick={() => setCustomerOpen(false)} aria-label="Close customer profile">
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <dl>
              <div><dt>Customer since</dt><dd>14 Feb 2025</dd></div>
              <div><dt>Orders</dt><dd>8 · £684.20</dd></div>
              <div><dt>Prior support cases</dt><dd>2 in 120 days</dd></div>
              <div><dt>Open cases</dt><dd>1</dd></div>
            </dl>
            <section>
              <h3>Connected records</h3>
              <p>{CASE_STORY.orderReference}</p>
              <p>Gorgias ticket #G-4107</p>
              <p>Shipment #S-814150-2</p>
            </section>
            <small>{CASE_STORY.privacy}</small>
          </aside>
        </>
      ) : null}

      <div className={styles.incidentToast} data-visible={message ? '' : undefined} aria-live="polite">
        {message}
        {message ? <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={14} /></button> : null}
      </div>
    </div>
  );
}
