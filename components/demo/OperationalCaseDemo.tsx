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
import { useMemo, useState } from 'react';
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
  const [step, setStep] = useState<DemoCaseStep>(initialStep);
  const [decision, setDecision] = useState<string | null>(null);
  const current = useMemo(
    () => DEMO_CASE_STEPS.find((item) => item.id === step) ?? DEMO_CASE_STEPS[0],
    [step],
  );
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
    <main
      className="ua-app ua-auth-surface min-h-screen bg-[var(--ua-canvas)] text-[var(--ua-text-primary)]"
      data-demo-fixture={MERCHANT_CASE_V1.version}
      data-demo-step={step}
    >
      <header className="border-b border-[var(--ua-border-subtle)] bg-[var(--ua-shell)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UnauthLogo
              kind="symbol"
              tone="white"
              background="graphite"
              height={32}
              priority
              alt=""
              decorative
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Unauth product demo</p>
              <p className="hidden text-xs text-[var(--ua-text-tertiary)] sm:block">
                {MERCHANT_CASE_V1.merchant} · deterministic fictional workspace
              </p>
            </div>
          </div>
          <nav aria-label="Demo actions" className="flex shrink-0 items-center gap-3">
            <Link
              href="/landing"
              className="hidden text-sm font-medium text-[var(--ua-text-secondary)] underline-offset-4 hover:underline sm:inline"
            >
              Product
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-sm font-semibold text-[var(--ua-action-primary-fg)] hover:bg-[var(--ua-action-primary-hover)]"
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ua-text-link)] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to product overview
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 border-b border-[var(--ua-border-subtle)] pb-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">
              Case review · {MERCHANT_CASE_V1.caseReference}
            </p>
            <h1 className="mt-2 text-[length:var(--ua-text-page-title-size)] font-semibold leading-[var(--ua-text-page-title-leading)] tracking-[var(--ua-text-page-title-tracking)]">
              {MERCHANT_CASE_V1.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--ua-text-secondary)]">
              {MERCHANT_CASE_V1.summary}
            </p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--ua-text-tertiary)]">
              <Meta label="Value at issue" value={MERCHANT_CASE_V1.order.value} />
              <Meta label="Owner" value="Unassigned" />
              <Meta label="Updated" value="09:20 UTC" />
            </dl>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge family="caseStatus" value="evidence_needed" size="sm" />
            <span className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-2.5 text-xs font-semibold text-[var(--ua-text-secondary)]">
              <LockKeyhole size={13} aria-hidden="true" />
              Read only
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <Surface structure="working" className="min-w-0 overflow-hidden">
            <div className="border-b border-[var(--ua-border-subtle)] px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">
                    Guided case state
                  </p>
                  <h2
                    id="demo-case-title"
                    className="mt-1 text-[length:var(--ua-text-section-title-size)] font-semibold leading-5"
                  >
                    {current.title}
                  </h2>
                </div>
                <p className="text-xs text-[var(--ua-text-tertiary)]">
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
                        className="w-full rounded-[var(--ua-radius-control)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-border-focus)]"
                        aria-current={active ? 'step' : undefined}
                      >
                        <span
                          className={`block h-2 rounded-[var(--ua-radius-control)] ${
                            active
                              ? 'bg-[var(--ua-action-primary)]'
                              : complete
                                ? 'bg-[var(--ua-success)]'
                                : 'bg-[var(--ua-surface-selected)]'
                          }`}
                        />
                        <span
                          className={`mt-2 hidden text-[length:var(--ua-text-metadata-size)] leading-4 sm:block ${
                            active
                              ? 'font-semibold text-[var(--ua-text-primary)]'
                              : 'text-[var(--ua-text-tertiary)]'
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ua-border-subtle)] px-4 py-4 sm:px-5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => move(-1)}
                disabled={index === 0}
                leadingIcon={<ArrowLeft size={14} />}
              >
                Back
              </Button>
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

          <aside className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]" aria-label="Demo boundaries">
            <Surface structure="working" className="overflow-hidden">
              <JoinedSection>
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-[var(--ua-success)]"
                    size={18}
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-semibold">Merchant control</h2>
                    <p className="mt-1 text-sm leading-5 text-[var(--ua-text-secondary)]">
                      Unauth recommends and records. Your team makes every final
                      customer, payout, responsibility, and recovery decision.
                    </p>
                  </div>
                </div>
              </JoinedSection>
              <JoinedSection>
                <h2 className="text-sm font-semibold">Scenario boundaries</h2>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--ua-text-secondary)]">
                  <li>No provider request is sent.</li>
                  <li>No refund, denial, or recovery is executed.</li>
                  <li>Selections remain in this browser session only.</li>
                </ul>
              </JoinedSection>
            </Surface>
            <InsetGroup>
              <p className="text-xs leading-5 text-[var(--ua-text-secondary)]">
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
      <p className="max-w-2xl text-sm leading-6 text-[var(--ua-text-secondary)]">
        A case enters from a connected support workflow. The first view leads
        with what happened, what is at stake, and what still needs a decision.
      </p>
      <dl className="grid gap-x-5 gap-y-0 border-y border-[var(--ua-border-subtle)] sm:grid-cols-2">
        <Fact label="Case" value={MERCHANT_CASE_V1.title} />
        <Fact
          label="Order"
          value={`${MERCHANT_CASE_V1.order.reference} · ${MERCHANT_CASE_V1.order.value}`}
        />
        <Fact label="Customer context" value={MERCHANT_CASE_V1.customer.history} />
        <Fact label="Current state" value="Evidence review required" tone="warning" />
      </dl>
      <InsetGroup>
        <p className="text-sm leading-5 text-[var(--ua-text-secondary)]">
          <strong className="text-[var(--ua-text-primary)]">Request:</strong>{' '}
          {MERCHANT_CASE_V1.order.item}
        </p>
      </InsetGroup>
    </div>
  );
}

function EvidenceStep() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">
        Every fact keeps a source and timestamp. A missing fact is visible as a
        gap, not filled with a guess.
      </p>
      <div className="divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
        {MERCHANT_CASE_V1.sources.map((source) => (
          <div
            key={source.label}
            className="grid gap-2 py-3 sm:grid-cols-[110px_minmax(0,1fr)_80px] sm:items-center"
          >
            <span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">
              {source.label}
            </span>
            <span className="text-sm text-[var(--ua-text-secondary)]">{source.fact}</span>
            <span className="text-xs text-[var(--ua-text-tertiary)] sm:text-right">
              {source.time}
            </span>
          </div>
        ))}
      </div>
      <div
        role="status"
        className="flex items-start gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-warning-border)] bg-[var(--ua-warning-bg)] p-3 text-sm text-[var(--ua-warning)]"
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
      <p className="max-w-2xl text-sm leading-6 text-[var(--ua-text-secondary)]">
        The recommendation is an explainable starting point for the merchant,
        not an outcome that executes on its own.
      </p>
      <div className="border-l-2 border-[var(--ua-accent-500)] bg-[var(--ua-accent-50)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-accent-700)]">
            Recommended action
          </span>
          <StatusBadge family="caseStatus" value="evidence_needed" size="sm" />
        </div>
        <p className="mt-2 text-[length:var(--ua-text-section-title-size)] font-semibold leading-5 text-[var(--ua-text-primary)]">
          {MERCHANT_CASE_V1.recommendation.action}
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--ua-text-secondary)]">
          {MERCHANT_CASE_V1.recommendation.rationale}
        </p>
      </div>
      <dl className="grid gap-x-5 border-y border-[var(--ua-border-subtle)] sm:grid-cols-2">
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
      <p className="text-sm leading-6 text-[var(--ua-text-secondary)]">
        Choose a simulated merchant action. This walkthrough changes local
        browser state only; it does not refund, deny, submit, or contact anyone.
      </p>
      <div className="divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
        {MERCHANT_CASE_V1.decisions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChoose(item.id)}
            className={`flex w-full items-start justify-between gap-4 px-2 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ua-border-focus)] ${
              selected === item.id
                ? 'bg-[var(--ua-accent-50)]'
                : 'hover:bg-[var(--ua-surface-hover)]'
            }`}
          >
            <span>
              <span className="font-semibold text-[var(--ua-text-primary)]">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-[var(--ua-text-secondary)]">
                {item.detail}
              </span>
            </span>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                selected === item.id
                  ? 'border-[var(--ua-accent-500)] bg-[var(--ua-accent-500)] text-[var(--ua-accent-fg)]'
                  : 'border-[var(--ua-border-strong)]'
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
  const decisionLabel =
    MERCHANT_CASE_V1.decisions.find((item) => item.id === decision)?.label ??
    'No simulated decision selected';
  return (
    <div className="space-y-5">
      <div
        role="status"
        className="flex items-start gap-3 border-l-2 border-[var(--ua-success)] bg-[var(--ua-success-bg)] px-4 py-3"
      >
        <Check
          className="mt-0.5 shrink-0 text-[var(--ua-success)]"
          size={18}
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-[var(--ua-text-primary)]">
            Simulated merchant decision recorded
          </p>
          <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">
            {decisionLabel}. No payout or external claim was executed.
          </p>
        </div>
      </div>
      <dl className="grid gap-x-5 border-y border-[var(--ua-border-subtle)] sm:grid-cols-2">
        <Fact
          label="Responsibility"
          value={MERCHANT_CASE_V1.recovery.responsibility}
          tone="warning"
        />
        <Fact label="Next handoff" value={MERCHANT_CASE_V1.recovery.handoff} />
        <Fact label="Deadline" value={MERCHANT_CASE_V1.recovery.deadline} />
      </dl>
      <div className="flex items-center gap-2 text-sm text-[var(--ua-text-tertiary)]">
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
    <div className="border-b border-[var(--ua-border-subtle)] py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-medium leading-5 ${
          tone === 'warning'
            ? 'text-[var(--ua-warning)]'
            : 'text-[var(--ua-text-primary)]'
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
      <dd className="font-semibold text-[var(--ua-text-secondary)]">{value}</dd>
    </div>
  );
}
