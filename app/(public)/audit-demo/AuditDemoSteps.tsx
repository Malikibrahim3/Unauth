'use client';

import { useMemo } from 'react';
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

type Props = {
  state: AuditDemoState;
  dispatch: React.Dispatch<AuditDemoAction>;
  onStartAudit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectProblem: (value: string) => void;
  onGoBack: () => void;
};

export default function AuditDemoSteps({ state, dispatch, onStartAudit, onSelectProblem, onGoBack }: Props) {
  const canGoBack = state.step > 1 && !state.loading;

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
          </>
        ) : null}
      </div>
    </>
  );
}
