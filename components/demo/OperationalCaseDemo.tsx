'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  InsetGroup,
  JoinedSection,
  StatusBadge,
  Surface,
} from '@/components/ui';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import {
  DEMO_CASE_STEPS,
  MERCHANT_CASE_V1,
  type DemoCaseStep,
} from '@/lib/demo/merchantCaseV1';

const STEP_ORDER = DEMO_CASE_STEPS.map((step) => step.id);

function stepIndex(step: DemoCaseStep) {
  return STEP_ORDER.indexOf(step);
}

export function OperationalCaseDemo({
  initialStep = 'incoming',
}: {
  initialStep?: DemoCaseStep;
}) {
  const [step, setStepState] = useState<DemoCaseStep>(initialStep);
  const [decision, setDecision] = useState<string | null>(null);
  const current = useMemo(
    () => DEMO_CASE_STEPS.find((item) => item.id === step) ?? DEMO_CASE_STEPS[0],
    [step],
  );
  const index = stepIndex(step);
  const isFinal = index === STEP_ORDER.length - 1;

  function setStep(nextStep: DemoCaseStep) {
    const params = new URLSearchParams(window.location.search);
    params.set('step', nextStep);
    window.history.replaceState(null, '', `/demo?${params.toString()}`);
    setStepState(nextStep);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === step) return;
    params.set('step', step);
    window.history.replaceState(null, '', `/demo?${params.toString()}`);
  }, [step]);

  function move(delta: number) {
    const next = Math.min(Math.max(index + delta, 0), STEP_ORDER.length - 1);
    setStep(STEP_ORDER[next]);
  }

  function chooseDecision(id: string) {
    setDecision(id);
    setStep('recovery');
  }

  return (
    <main
      className="ua-app ua-auth-surface min-h-screen bg-[var(--uo-route-canvas)] text-[var(--uo-route-text-primary)]"
      data-surface-id="synthetic-operational-case-demo"
      data-archetype="P8"
      data-demo-fixture={MERCHANT_CASE_V1.version}
      data-demo-step={step}
    >
      <header className="border-b border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-shell)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UnauthLogo
              kind="symbol"
              tone="graphite"
              height={32}
              priority
              alt=""
              decorative
            />
            <div className="min-w-0">
              <p className="ua-text-working-title truncate">Unauth product demo</p>
              <p className="ua-text-metadata hidden sm:block">
                {MERCHANT_CASE_V1.merchant} · deterministic fictional workspace
              </p>
            </div>
          </div>
          <nav aria-label="Demo actions" className="flex shrink-0 items-center gap-3">
            <Link
              href="/landing"
              className="hidden ua-text-dense font-medium text-[var(--uo-route-text-secondary)] underline-offset-4 hover:underline sm:inline"
            >
              Product
            </Link>
            <Link
              href="/signup"
              className="ua-text-working-title inline-flex h-9 items-center gap-1.5 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-action-primary)] px-3 text-[var(--uo-route-action-primary-fg)] hover:bg-[var(--uo-route-action-primary-hover)]"
            >
              Create workspace
              <ExternalLink size={14} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Link
          href="/landing"
          className="ua-text-working-title inline-flex items-center gap-1.5 text-[var(--uo-route-text-link)] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to product overview
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 border-b border-[var(--uo-route-border-subtle)] pb-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="ua-text-metadata text-[length:var(--uo-route-text-metadata-size)]">
              Case review · {MERCHANT_CASE_V1.caseReference}
            </p>
            <h1 className="ua-text-page-title mt-2 text-[length:var(--uo-route-text-page-title-size)] leading-[var(--uo-route-text-page-title-leading)] tracking-[var(--uo-route-text-page-title-tracking)]">
              {MERCHANT_CASE_V1.title}
            </h1>
            <p className="ua-text-body mt-2 max-w-3xl leading-5 text-[var(--uo-route-text-secondary)]">
              {MERCHANT_CASE_V1.summary}
            </p>
            <dl className="ua-text-metadata mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Meta label="Value at issue" value={MERCHANT_CASE_V1.order.value} />
              <Meta label="Owner" value="Unassigned" />
              <Meta label="Updated" value="09:20 UTC" />
            </dl>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge family="caseStatus" value="evidence_needed" size="sm" />
            <span className="ua-text-label inline-flex h-8 items-center gap-1.5 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] px-2.5">
              <LockKeyhole size={13} aria-hidden="true" />
              Read only
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,4fr)_minmax(0,8fr)]">
          <aside className="min-w-0" aria-label="Persistent synthetic case summary">
            <Surface structure="working" className="overflow-hidden lg:sticky lg:top-5">
              <JoinedSection>
                <h2 className="ua-text-section-title">Case context</h2>
                <p className="ua-text-body mt-2 leading-5 text-[var(--uo-route-text-secondary)]">The source facts and current operating boundary remain visible while the walkthrough advances.</p>
              </JoinedSection>
              <JoinedSection>
                <dl className="divide-y divide-[var(--uo-route-border-subtle)]">
                  <ContextFact label="Case" value={MERCHANT_CASE_V1.caseReference} />
                  <ContextFact label="Merchant" value={MERCHANT_CASE_V1.merchant} />
                  <ContextFact label="Value at issue" value={MERCHANT_CASE_V1.order.value} />
                  <ContextFact label="Current boundary" value={current.label} />
                  <ContextFact label="External writes" value="None — synthetic demo" />
                </dl>
              </JoinedSection>
            </Surface>
          </aside>
          <Surface structure="working" className="min-w-0 overflow-hidden">
            <div className="border-b border-[var(--uo-route-border-subtle)] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="demo-case-title"
                    className="ua-text-section-title text-[length:var(--uo-route-text-section-title-size)] leading-5"
                  >
                    {current.title}
                  </h2>
                </div>
                <p className="ua-text-metadata">
                  Step {index + 1} of {STEP_ORDER.length}
                </p>
              </div>
              <ol
                className="mt-5 grid grid-cols-5 gap-1.5"
                aria-label="Case walkthrough steps"
              >
                {DEMO_CASE_STEPS.map((item, itemIndex) => {
                  const active = item.id === step;
                  const complete = itemIndex < index;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setStep(item.id)}
                        className="w-full rounded-[var(--uo-route-radius-control)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--uo-route-border-focus)]"
                        aria-current={active ? 'step' : undefined}
                      >
                        <span
                          className={`block h-2 rounded-[var(--uo-route-radius-control)] ${
                            active
                              ? 'bg-[var(--uo-route-action-primary)]'
                              : complete
                                ? 'bg-[var(--uo-route-success)]'
                                : 'bg-[var(--uo-route-surface-selected)]'
                          }`}
                        />
                        <span
                          className={`mt-2 hidden text-[length:var(--uo-route-text-metadata-size)] leading-4 sm:block ${
                            active
                              ? 'ua-text-working-title text-[var(--uo-route-text-primary)]'
                              : 'text-[var(--uo-route-text-tertiary)]'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="sr-only">
                          {item.label}
                          {active ? ' (current)' : complete ? ' (complete)' : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <JoinedSection
              aria-labelledby="demo-case-title"
              aria-live="polite"
              className="min-h-[20rem]"
            >
              {step === 'incoming' ? <IncomingStep /> : null}
              {step === 'evidence' ? <EvidenceStep /> : null}
              {step === 'recommendation' ? <RecommendationStep /> : null}
              {step === 'decision' ? (
                <DecisionStep selected={decision} onChoose={chooseDecision} />
              ) : null}
              {step === 'recovery' ? <RecoveryStep decision={decision} /> : null}
            </JoinedSection>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--uo-route-border-subtle)] px-4 py-4 sm:px-5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => move(-1)}
                disabled={index === 0}
                leadingIcon={<ArrowLeft size={14} />}
              >
                Back
              </Button>
              <button type="button" className="ua-text-label text-[var(--uo-route-text-secondary)] hover:text-[var(--uo-route-text-primary)]" onClick={() => { setDecision(null); setStep('incoming'); }}>Reset demo</button>
              {!isFinal ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => move(1)}
                  leadingIcon={<ArrowRight size={14} />}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDecision(null);
                    setStep('incoming');
                  }}
                >
                  Start again
                </Button>
              )}
            </div>
          </Surface>

          <aside className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:col-span-2" aria-label="Demo boundaries">
            <Surface structure="working" className="overflow-hidden">
              <JoinedSection>
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-[var(--uo-route-success)]"
                    size={18}
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="ua-text-working-title">Merchant control</h2>
                    <p className="ua-text-body mt-1 leading-5 text-[var(--uo-route-text-secondary)]">
                      Unauth recommends and records. Your team makes every final
                      customer, payout, responsibility, and recovery decision.
                    </p>
                  </div>
                </div>
              </JoinedSection>
              <JoinedSection>
                <h2 className="ua-text-working-title">Scenario boundaries</h2>
                <ul className="ua-text-caption-role mt-3 space-y-2 leading-5">
                  <li>No provider request is sent.</li>
                  <li>No refund, denial, or recovery is executed.</li>
                  <li>Selections remain in this browser session only.</li>
                </ul>
              </JoinedSection>
            </Surface>
            <InsetGroup>
              <p className="ua-text-caption-role leading-5">
                {MERCHANT_CASE_V1.privacy}
              </p>
            </InsetGroup>
          </aside>
        </div>
      </div>
    </main>
  );
}

function IncomingStep() {
  return (
    <div className="space-y-5">
      <p className="ua-text-body max-w-2xl leading-6 text-[var(--uo-route-text-secondary)]">
        A case enters from a connected support workflow. The first view leads
        with what happened, what is at stake, and what still needs a decision.
      </p>
      <dl className="grid gap-x-5 gap-y-0 border-y border-[var(--uo-route-border-subtle)] sm:grid-cols-2">
        <Fact label="Case" value={MERCHANT_CASE_V1.title} />
        <Fact
          label="Order"
          value={`${MERCHANT_CASE_V1.order.reference} · ${MERCHANT_CASE_V1.order.value}`}
        />
        <Fact label="Customer context" value={MERCHANT_CASE_V1.customer.history} />
        <Fact label="Current state" value="Evidence review required" tone="warning" />
      </dl>
      <InsetGroup>
        <p className="ua-text-body leading-5 text-[var(--uo-route-text-secondary)]">
          <strong className="text-[var(--uo-route-text-primary)]">Request:</strong>{' '}
          {MERCHANT_CASE_V1.order.item}
        </p>
      </InsetGroup>
    </div>
  );
}

function EvidenceStep() {
  return (
    <div className="space-y-5">
      <p className="ua-text-body leading-6 text-[var(--uo-route-text-secondary)]">
        Every fact keeps a source and timestamp. A missing fact is visible as a
        gap, not filled with a guess.
      </p>
      <div className="divide-y divide-[var(--uo-route-border-subtle)] border-y border-[var(--uo-route-border-subtle)]">
        {MERCHANT_CASE_V1.sources.map((source) => (
          <div
            key={source.label}
            className="grid gap-2 py-3 sm:grid-cols-[110px_minmax(0,1fr)_80px] sm:items-center"
          >
            <span className="ua-text-metadata text-[length:var(--uo-route-text-metadata-size)]">
              {source.label}
            </span>
            <span className="ua-text-dense text-[var(--uo-route-text-secondary)]">{source.fact}</span>
            <span className="ua-text-metadata sm:text-right">
              {source.time}
            </span>
          </div>
        ))}
      </div>
      <div
        role="status"
        className="ua-text-body flex items-start gap-2 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-warning-border)] bg-[var(--uo-route-warning-bg)] p-3 text-[var(--uo-route-warning)]"
      >
        <CircleAlert className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
        Parcel contents are not confirmed by the available sources.
      </div>
    </div>
  );
}

function RecommendationStep() {
  return (
    <div className="space-y-5">
      <p className="ua-text-body max-w-2xl leading-6 text-[var(--uo-route-text-secondary)]">
        The recommendation is an explainable starting point for the merchant,
        not an outcome that executes on its own.
      </p>
      <div className="border-l border-[var(--uo-route-accent-500)] bg-[var(--uo-route-accent-50)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="ua-text-working-title text-[length:var(--uo-route-text-metadata-size)] text-[var(--uo-route-accent-700)]">
            Recommended action
          </span>
          <StatusBadge family="caseStatus" value="evidence_needed" size="sm" />
        </div>
        <p className="ua-text-section-title mt-2 text-[length:var(--uo-route-text-section-title-size)] leading-5 text-[var(--uo-route-text-primary)]">
          {MERCHANT_CASE_V1.recommendation.action}
        </p>
        <p className="ua-text-body mt-1 max-w-2xl leading-5 text-[var(--uo-route-text-secondary)]">
          {MERCHANT_CASE_V1.recommendation.rationale}
        </p>
      </div>
      <dl className="grid gap-x-5 border-y border-[var(--uo-route-border-subtle)] sm:grid-cols-2">
        <Fact label="Matched rule" value={MERCHANT_CASE_V1.recommendation.rule} />
        <Fact
          label="Confidence"
          value={MERCHANT_CASE_V1.recommendation.confidence}
          tone="warning"
        />
        <Fact label="Evidence gap" value={MERCHANT_CASE_V1.recommendation.gap} />
      </dl>
    </div>
  );
}

function DecisionStep({
  selected,
  onChoose,
}: {
  selected: string | null;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="ua-text-body leading-6 text-[var(--uo-route-text-secondary)]">
        Choose a simulated merchant action. This walkthrough changes local
        browser state only; it does not refund, deny, submit, or contact anyone.
      </p>
      <div className="divide-y divide-[var(--uo-route-border-subtle)] border-y border-[var(--uo-route-border-subtle)]">
        {MERCHANT_CASE_V1.decisions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChoose(item.id)}
            className={`flex w-full items-start justify-between gap-4 px-2 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--uo-route-border-focus)] ${
              selected === item.id
                ? 'bg-[var(--uo-route-accent-50)]'
                : 'hover:bg-[var(--uo-route-surface-hover)]'
            }`}
          >
            <span>
              <span className="ua-text-working-title text-[var(--uo-route-text-primary)]">{item.label}</span>
              <span className="ua-text-dense mt-1 block leading-5 text-[var(--uo-route-text-secondary)]">
                {item.detail}
              </span>
            </span>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected === item.id
                  ? 'border-[var(--uo-route-accent-500)] bg-[var(--uo-route-accent-500)] text-[var(--uo-route-accent-fg)]'
                  : 'border-[var(--uo-route-border-strong)]'
              }`}
              aria-hidden="true"
            >
              {selected === item.id ? <Check size={13} /> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecoveryStep({ decision }: { decision: string | null }) {
  const decisionLabel = MERCHANT_CASE_V1.decisions.find((item) => item.id === decision)?.label ?? null;
  return (
    <div className="space-y-5">
      <div
        role="status"
        className={`flex items-start gap-3 border-l px-4 py-3 ${
          decisionLabel
            ? 'border-[var(--uo-route-success)] bg-[var(--uo-route-success-bg)]'
            : 'border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-secondary)]'
        }`}
      >
        {decisionLabel ? (
          <Check
            className="mt-0.5 shrink-0 text-[var(--uo-route-success)]"
            size={18}
            aria-hidden="true"
          />
        ) : (
          <Clock3
            className="mt-0.5 shrink-0 text-[var(--uo-route-icon-secondary)]"
            size={18}
            aria-hidden="true"
          />
        )}
        <div>
          <p className="ua-text-working-title text-[var(--uo-route-text-primary)]">
            {decisionLabel ? 'Simulated merchant decision recorded' : 'No simulated decision recorded'}
          </p>
          <p className="ua-text-body mt-1 text-[var(--uo-route-text-secondary)]">
            {decisionLabel
              ? `${decisionLabel}. No payout or external claim was executed.`
              : 'Choose a simulated action in the previous step to add one. No payout or external claim was executed.'}
          </p>
        </div>
      </div>
      <dl className="grid gap-x-5 border-y border-[var(--uo-route-border-subtle)] sm:grid-cols-2">
        <Fact
          label="Responsibility"
          value={MERCHANT_CASE_V1.recovery.responsibility}
          tone="warning"
        />
        <Fact label="Next handoff" value={MERCHANT_CASE_V1.recovery.handoff} />
        <Fact label="Deadline" value={MERCHANT_CASE_V1.recovery.deadline} />
      </dl>
      <div className="ua-text-dense flex items-center gap-2 text-[var(--uo-route-text-tertiary)]">
        <Clock3 size={15} aria-hidden="true" />
        This is a read-only preview of the case timeline.
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'warning';
}) {
  return (
    <div className="border-b border-[var(--uo-route-border-subtle)] py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[length:var(--uo-route-text-metadata-size)] font-medium text-[var(--uo-route-text-tertiary)]">
        {label}
      </dt>
      <dd
        className={`mt-1 ua-text-dense font-medium leading-5 ${
          tone === 'warning'
            ? 'text-[var(--uo-route-warning)]'
            : 'text-[var(--uo-route-text-primary)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="ua-text-label">{value}</dd>
    </div>
  );
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return <div className="py-3 first:pt-0 last:pb-0"><dt className="ua-text-caption-role">{label}</dt><dd className="ua-text-dense mt-1 font-medium text-[var(--uo-route-text-primary)]">{value}</dd></div>;
}
