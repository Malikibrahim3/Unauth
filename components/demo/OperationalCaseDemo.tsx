'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, ExternalLink, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, StatusBadge } from '@/components/ui';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { DEMO_CASE_STEPS, MERCHANT_CASE_V1, type DemoCaseStep } from '@/lib/demo/merchantCaseV1';

const STEP_ORDER = DEMO_CASE_STEPS.map((step) => step.id);

function stepIndex(step: DemoCaseStep) {
  return STEP_ORDER.indexOf(step);
}

export function OperationalCaseDemo() {
  const [step, setStep] = useState<DemoCaseStep>('incoming');
  const [decision, setDecision] = useState<string | null>(null);
  const current = useMemo(() => DEMO_CASE_STEPS.find((item) => item.id === step) ?? DEMO_CASE_STEPS[0], [step]);
  const index = stepIndex(step);
  const isFinal = index === STEP_ORDER.length - 1;

  function move(delta: number) {
    const next = Math.min(Math.max(index + delta, 0), STEP_ORDER.length - 1);
    setStep(STEP_ORDER[next]);
  }

  function chooseDecision(id: string) {
    setDecision(id);
    setStep('recovery');
  }

  return (
    <main className="ua-auth-surface min-h-screen bg-[var(--ua-canvas)] text-[var(--ua-text-primary)]">
      <div className="sticky top-0 z-20 border-b border-[var(--ua-border-subtle)] bg-[var(--ua-shell)] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
            <UnauthLogo kind="symbol" tone="white" background="graphite" height={32} alt="" decorative />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Unauth case walkthrough</p>
              <p className="hidden text-xs text-[var(--ua-text-tertiary)] sm:block">Read-only synthetic data · no external actions</p>
            </div>
          </div>
          <Link href="/login" className="shrink-0 text-sm font-semibold text-[var(--ua-text-link)] underline underline-offset-2">Create workspace</Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start">
          <header className="lg:sticky lg:top-24">
            <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">Operational preview</p>
            <h1 className="mt-3 text-[length:var(--ua-text-page-title-size)] font-semibold leading-6 tracking-normal">Decide with the full case in front of you.</h1>
            <p className="mt-3 max-w-xl text-sm leading-5 text-[var(--ua-text-secondary)]">Walk through how Unauth assembles evidence, explains a recommendation, and keeps the merchant decision and recovery handoff together.</p>
            <div className="mt-6 rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-[var(--ua-success)]" size={18} aria-hidden="true" />
                <p className="text-sm leading-6 text-[var(--ua-text-secondary)]"><strong className="text-[var(--ua-text-primary)]">Unauth recommends and records.</strong> Your team makes every final customer, payout, responsibility, and recovery decision.</p>
              </div>
            </div>
          </header>

          <section aria-labelledby="demo-case-title" className="rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]">
            <div className="border-b border-[var(--ua-border-subtle)] p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">Synthetic case · {MERCHANT_CASE_V1.caseReference}</p>
                  <h2 id="demo-case-title" className="mt-1 text-[length:var(--ua-text-section-title-size)] font-semibold leading-5">{current.title}</h2>
                </div>
                <StatusBadge family="workflowStatus" value={isFinal ? 'complete' : 'in_progress'} size="sm" />
              </div>
              <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Demo steps">
                {DEMO_CASE_STEPS.map((item, itemIndex) => {
                  const active = item.id === step;
                  const complete = itemIndex < index;
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => setStep(item.id)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-border-focus)]" aria-current={active ? 'step' : undefined}>
                        <span className={`block h-1 rounded-full ${active ? 'bg-[var(--ua-surface-inverse)]' : complete ? 'bg-[var(--ua-success)]' : 'bg-[var(--ua-surface-selected)]'}`} />
                        <span className={`mt-2 hidden text-[length:var(--ua-text-metadata-size)] leading-4 sm:block ${active ? 'font-semibold text-[var(--ua-text-primary)]' : 'text-[var(--ua-text-tertiary)]'}`}>{item.label}</span>
                        <span className="sr-only">{item.label}{active ? ' (current)' : complete ? ' (complete)' : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {step === 'incoming' ? <IncomingStep /> : null}
              {step === 'evidence' ? <EvidenceStep /> : null}
              {step === 'recommendation' ? <RecommendationStep /> : null}
              {step === 'decision' ? <DecisionStep selected={decision} onChoose={chooseDecision} /> : null}
              {step === 'recovery' ? <RecoveryStep decision={decision} /> : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ua-border-subtle)] p-4 sm:p-6">
              <Button variant="secondary" size="sm" onClick={() => move(-1)} disabled={index === 0} leadingIcon={<ArrowLeft size={14} />}>Back</Button>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ua-radius-control)] px-3 text-sm font-semibold text-[var(--ua-text-link)] hover:bg-[var(--ua-surface-hover)]">Create workspace <ExternalLink size={14} aria-hidden="true" /></Link>
                {!isFinal ? <Button variant="primary" size="sm" onClick={() => move(1)} leadingIcon={<ArrowRight size={14} />}>Next</Button> : <Button variant="primary" size="sm" onClick={() => { setDecision(null); setStep('incoming'); }}>Start again</Button>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function IncomingStep() {
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">A case enters from a connected support workflow. The first view is intentionally compact: what happened, what is at stake, and what still needs a decision.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Fact label="Case" value={MERCHANT_CASE_V1.title} />
      <Fact label="Order" value={`${MERCHANT_CASE_V1.order.reference} · ${MERCHANT_CASE_V1.order.value}`} />
      <Fact label="Customer context" value={MERCHANT_CASE_V1.customer.history} />
      <Fact label="Current state" value="Evidence review required" tone="warning" />
    </div>
    <div className="rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-4 text-sm leading-5 text-[var(--ua-text-secondary)]"><strong className="text-[var(--ua-text-primary)]">Request:</strong> {MERCHANT_CASE_V1.order.item}</div>
  </div>;
}

function EvidenceStep() {
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">Every fact keeps a source and timestamp. A missing fact is visible as a gap, not filled with a guess.</p>
    <div className="space-y-2">
      {MERCHANT_CASE_V1.sources.map((source) => <div key={source.label} className="grid gap-2 rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] p-3 sm:grid-cols-[110px_minmax(0,1fr)_80px] sm:items-center"><span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">{source.label}</span><span className="text-sm text-[var(--ua-text-secondary)]">{source.fact}</span><span className="text-xs text-[var(--ua-text-tertiary)] sm:text-right">{source.time}</span></div>)}
    </div>
    <div className="flex items-start gap-2 rounded-[var(--ua-radius-surface)] border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-sm text-[var(--ua-warning)]"><CircleAlert className="mt-0.5 shrink-0" size={16} aria-hidden="true" />Parcel contents are not confirmed by the available sources.</div>
  </div>;
}

function RecommendationStep() {
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">The recommendation is an explainable starting point for the merchant, not an outcome that executes on its own.</p>
    <div className="rounded-[var(--ua-radius-surface)] border border-[var(--ua-info-border)] bg-[var(--ua-info-bg)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-info)]">Recommended action</span><StatusBadge family="caseStatus" value="evidence_needed" size="sm" /></div><p className="mt-2 text-[length:var(--ua-text-section-title-size)] font-semibold leading-5 text-[var(--ua-text-primary)]">{MERCHANT_CASE_V1.recommendation.action}</p><p className="mt-1 text-sm leading-5 text-[var(--ua-text-secondary)]">{MERCHANT_CASE_V1.recommendation.rationale}</p></div>
    <dl className="grid gap-3 sm:grid-cols-2"><Fact label="Matched rule" value={MERCHANT_CASE_V1.recommendation.rule} /><Fact label="Confidence" value={MERCHANT_CASE_V1.recommendation.confidence} tone="warning" /><Fact label="Evidence gap" value={MERCHANT_CASE_V1.recommendation.gap} /></dl>
  </div>;
}

function DecisionStep({ selected, onChoose }: { selected: string | null; onChoose: (id: string) => void }) {
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">Choose a simulated merchant action. This walkthrough changes local browser state only; it does not refund, deny, submit, or contact anyone.</p>
    <div className="grid gap-3">
      {MERCHANT_CASE_V1.decisions.map((item) => <button key={item.id} type="button" onClick={() => onChoose(item.id)} className={`rounded-[var(--ua-radius-surface)] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-border-focus)] ${selected === item.id ? 'border-[var(--ua-surface-inverse)] bg-[var(--ua-surface-selected)]' : 'border-[var(--ua-border-default)] hover:bg-[var(--ua-surface-hover)]'}`}><span className="flex items-start justify-between gap-3"><span className="font-semibold text-[var(--ua-text-primary)]">{item.label}</span>{selected === item.id ? <Check size={17} className="text-[var(--ua-success)]" aria-hidden="true" /> : null}</span><span className="mt-1 block text-sm leading-5 text-[var(--ua-text-secondary)]">{item.detail}</span></button>)}
    </div>
  </div>;
}

function RecoveryStep({ decision }: { decision: string | null }) {
  const decisionLabel = MERCHANT_CASE_V1.decisions.find((item) => item.id === decision)?.label ?? 'No simulated decision selected';
  return <div className="space-y-5">
    <div className="flex items-start gap-3 rounded-[var(--ua-radius-surface)] border border-[var(--ua-success-border)] bg-[var(--ua-success-bg)] p-4"><Check className="mt-0.5 shrink-0 text-[var(--ua-success)]" size={18} aria-hidden="true" /><div><p className="font-semibold text-[var(--ua-text-primary)]">Simulated merchant decision recorded</p><p className="mt-1 text-sm text-[var(--ua-text-secondary)]">{decisionLabel}. No payout or external claim was executed.</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><Fact label="Responsibility" value={MERCHANT_CASE_V1.recovery.responsibility} tone="warning" /><Fact label="Next handoff" value={MERCHANT_CASE_V1.recovery.handoff} /><Fact label="Deadline" value={MERCHANT_CASE_V1.recovery.deadline} /></div>
    <div className="flex items-center gap-2 text-sm text-[var(--ua-text-tertiary)]"><Clock3 size={15} aria-hidden="true" />This is a read-only preview of the case timeline.</div>
  </div>;
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return <div className="rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] p-3"><dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">{label}</dt><dd className={`mt-1 text-sm font-medium leading-5 ${tone === 'warning' ? 'text-[var(--ua-warning)]' : 'text-[var(--ua-text-primary)]'}`}>{value}</dd></div>;
}
