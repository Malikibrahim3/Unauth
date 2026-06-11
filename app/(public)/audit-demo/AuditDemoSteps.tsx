'use client';

import { useMemo } from 'react';
import { AnalyticsBarChart } from '@/components/analytics/AnalyticsBarChart';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AuditDemoAction, AuditDemoState } from '@/app/(public)/audit-demo/auditDemoReducer';
import styles from '@/app/(public)/audit-demo/AuditDemoClient.module.css';

const platformOptions = [
  { label: 'Shopify', value: 'shopify' },
  { label: 'WooCommerce', value: 'woocommerce' },
  { label: 'Magento', value: 'magento' },
  { label: 'Other', value: 'other' },
] as const;

const volumeOptions = [
  { label: 'Under 1,000', value: 'under-1000' },
  { label: '1,000 – 10,000', value: '1000-10000' },
  { label: '10,000 – 50,000', value: '10000-50000' },
  { label: '50,000+', value: '50000plus' },
] as const;

const problemOptions = [
  { label: 'Refund abuse', value: 'refund-abuse' },
  { label: 'Chargebacks', value: 'chargebacks' },
  { label: 'Both', value: 'both' },
  { label: 'Not sure yet', value: 'not-sure-yet' },
] as const;

function ProgressBar({ step }: { step: AuditDemoState['step'] }) {
  const scale = step === 1 ? 0.333333 : step === 2 ? 0.666666 : 1;
  return (
    <div className={styles.progressTrack} aria-hidden="true">
      <div className={styles.progressFill} style={{ transform: `scaleX(${scale})` }} />
    </div>
  );
}

function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.optionCard} ${selected ? styles.optionCardSelected : ''}`}
    >
      {label}
    </button>
  );
}

function buildPreview(state: AuditDemoState) {
  const volumeMultiplier =
    state.volume === 'under-1000' ? 0.8 :
    state.volume === '1000-10000' ? 1.1 :
    state.volume === '10000-50000' ? 1.45 :
    state.volume === '50000plus' ? 1.8 :
    1;
  const platformMultiplier =
    state.platform === 'shopify' ? 1.15 :
    state.platform === 'woocommerce' ? 0.95 :
    state.platform === 'magento' ? 1.05 :
    0.9;
  const problemBias =
    state.problem === 'refund-abuse' ? { refunds: 56, chargebacks: 18, repeat: 26 } :
    state.problem === 'chargebacks' ? { refunds: 22, chargebacks: 54, repeat: 24 } :
    state.problem === 'both' ? { refunds: 38, chargebacks: 34, repeat: 28 } :
    { refunds: 34, chargebacks: 26, repeat: 40 };

  const baseRows = Math.round(280 * volumeMultiplier * platformMultiplier);
  const likelyMatches = Math.max(8, Math.round(baseRows * 0.12));
  const evidenceReady = Math.max(2, Math.round(likelyMatches * 0.24));

  return {
    kpis: [
      { label: 'Likely repeated identities', value: likelyMatches.toLocaleString() },
      { label: 'Evidence-ready cases', value: evidenceReady.toLocaleString() },
      { label: 'Rows sampled in preview', value: baseRows.toLocaleString() },
    ],
    mix: [
      { label: 'Refund patterns', value: problemBias.refunds, color: 'var(--accent)' },
      { label: 'Chargeback risk', value: problemBias.chargebacks, color: 'var(--sev-probable, #C7762B)' },
      { label: 'Repeat identities', value: problemBias.repeat, color: 'var(--sev-clear, #3E7A63)' },
    ],
    bars: [
      { label: 'Week 1', value: Math.round(likelyMatches * 0.55), color: 'var(--surface-border)' },
      { label: 'Week 2', value: Math.round(likelyMatches * 0.72), color: 'var(--surface-border)' },
      { label: 'Week 3', value: Math.round(likelyMatches * 0.9), color: 'var(--accent)' },
      { label: 'Week 4', value: likelyMatches, color: 'var(--accent)' },
    ],
  };
}

type Props = {
  state: AuditDemoState;
  dispatch: React.Dispatch<AuditDemoAction>;
  onStartAudit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectProblem: (value: string) => void;
  onGoBack: () => void;
};

export default function AuditDemoSteps({ state, dispatch, onStartAudit, onSelectProblem, onGoBack }: Props) {
  const canGoBack = state.step > 1 && !state.loading;
  const preview = useMemo(() => buildPreview(state), [state]);

  const subtitle = useMemo(() => {
    if (state.step === 1) return "We'll tailor the demo to your setup.";
    if (state.step === 2) return 'This helps us show you a relevant scale of identity matches.';
    return "We'll lead with the patterns most relevant to you.";
  }, [state.step]);

  const heading = state.step === 1
    ? 'What platform are you selling on?'
    : state.step === 2
      ? 'How many orders do you process per month?'
      : "What's your biggest headache right now?";

  return (
    <>
      <p className={styles.eyebrow}>
        {state.step === 0 ? '60-second interactive demo' : `Step ${state.step} of 3`}
      </p>

      {state.step > 0 ? <ProgressBar step={state.step} /> : null}

      {canGoBack ? (
        <button type="button" onClick={onGoBack} className={`${styles.backButton} hover:underline`}>
          ← Back
        </button>
      ) : null}

      <div className={styles.contentFade} style={{ opacity: state.loading ? 0.75 : 1 }}>
        {state.step === 0 ? (
          <>
            <h1 className={styles.heading}>See which identities repeat in your data.</h1>
            <p className={styles.subtitle}>
              Answer three quick questions, then we&apos;ll send you to the real free CSV audit for your store.
            </p>
            <form onSubmit={onStartAudit} className="grid grid-cols-1 gap-3">
              <Input
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                placeholder="you@yourstore.com"
                value={state.email}
                onChange={(event) => {
                  dispatch({ type: 'patch', patch: { email: event.target.value, emailError: '' } });
                }}
                className="h-12 rounded-md border-[var(--landing-border)] bg-white px-4 text-[15px] text-[var(--landing-ink)] placeholder:text-[var(--landing-ink-tertiary)]"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-md normal-case tracking-normal"
                style={{
                  background: 'var(--landing-accent)',
                  borderColor: 'var(--landing-accent)',
                  color: 'var(--landing-accent-fg)',
                }}
              >
                Start interactive demo →
              </Button>
            </form>
            {state.emailError ? <p className={styles.emailError}>{state.emailError}</p> : null}

            <div className="mt-6 rounded-md border p-4" style={{ borderColor: 'var(--landing-border)', background: 'rgba(255,255,255,0.64)' }}>
              <div className="grid gap-3 sm:grid-cols-3">
                {preview.kpis.map((item) => (
                  <div key={item.label}>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--landing-ink-tertiary)' }}>{item.label}</p>
                    <p className="mt-1 text-[22px] font-semibold leading-none" style={{ color: 'var(--landing-ink)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--landing-ink)' }}>Pattern mix preview</p>
                  <AnalyticsDonutChart data={preview.mix} height={180} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--landing-ink)' }}>Projected weekly review load</p>
                  <AnalyticsBarChart data={preview.bars} height={180} />
                </div>
              </div>
            </div>
          </>
        ) : null}

        {state.step > 0 ? (
          <>
            <h1 className={styles.heading}>{heading}</h1>
            <p className={styles.subtitle}>{subtitle}</p>

            {state.loading ? (
              <p className={styles.loadingCopy}>Taking you to the free audit…</p>
            ) : null}

            {!state.loading && state.step === 1 ? (
              <div className="grid grid-cols-1 gap-3">
                {platformOptions.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    selected={state.platform === option.value}
                    onClick={() => dispatch({ type: 'selectPlatform', value: option.value })}
                  />
                ))}
              </div>
            ) : null}

            {!state.loading && state.step === 2 ? (
              <div className="grid grid-cols-1 gap-3">
                {volumeOptions.map((option) => {
                  const selected = state.volume === option.value;
                  const isHigh = option.value === '50000plus';
                  return (
                    <div key={option.value}>
                      <OptionCard
                        label={option.label}
                        selected={selected}
                        onClick={() => dispatch({ type: 'selectVolume', value: option.value, isHigh })}
                      />
                      {isHigh && selected && state.showHighVolumeFork ? (
                        <div className={styles.highVolumePanel}>
                          <p className={styles.highVolumeCopy}>
                            At your volume, start with the free CSV audit - you can always talk to us after you see results.
                          </p>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'continueAfterHighVolume' })}
                            className={`${styles.continueAuditButton} hover:bg-[var(--landing-accent-hover,#60231e)]`}
                          >
                            Continue to free audit →
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!state.loading && state.step === 3 ? (
              <div className="grid grid-cols-1 gap-3">
                {problemOptions.map((option) => (
                  <OptionCard
                    key={option.value}
                    label={option.label}
                    selected={state.problem === option.value}
                    onClick={() => onSelectProblem(option.value)}
                  />
                ))}
              </div>
            ) : null}

            {!state.loading ? (
              <div className="mt-6 rounded-md border p-4" style={{ borderColor: 'var(--landing-border)', background: 'rgba(255,255,255,0.64)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--landing-ink)' }}>Live preview</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--landing-ink-tertiary)' }}>
                  This is the kind of summary we&apos;ll lead with once your audit is live.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {preview.kpis.map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--landing-ink-tertiary)' }}>{item.label}</p>
                      <p className="mt-1 text-[20px] font-semibold leading-none" style={{ color: 'var(--landing-ink)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
