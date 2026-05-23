'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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

type Step = 0 | 1 | 2 | 3;

function ProgressBar({ step }: { step: Step }) {
  const progress = step === 1 ? 33.333 : step === 2 ? 66.666 : 100;

  return (
    <div className="mb-6">
      <div
        aria-hidden="true"
        style={{
          height: 8,
          background: 'var(--landing-line-faint, #efeadd)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--landing-accent, #7b2d26), color-mix(in srgb, var(--landing-accent, #7b2d26) 78%, white))',
            borderRadius: 999,
            transition: 'width 220ms ease',
          }}
        />
      </div>
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
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: '14px',
        border: selected ? '1px solid var(--landing-accent, #7b2d26)' : '1px solid var(--landing-border, #d9d0c1)',
        background: selected ? 'color-mix(in srgb, var(--landing-accent, #7b2d26) 8%, white)' : 'var(--landing-bg, #f8f5ee)',
        color: 'var(--landing-ink, #1f1a15)',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
        fontSize: '15px',
        transition: 'all 180ms ease',
      }}
      className="hover:border-[var(--landing-accent,#7b2d26)]"
    >
      {label}
    </button>
  );
}

export default function AuditDemoClient({ initialEmail = '' }: { initialEmail?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialEmail ? 1 : 0);
  const [email, setEmail] = useState(initialEmail);
  const [platform, setPlatform] = useState<string>('');
  const [volume, setVolume] = useState<string>('');
  const [problem, setProblem] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showHighVolumeFork, setShowHighVolumeFork] = useState(false);
  const [emailError, setEmailError] = useState('');

  const canGoBack = step > 1 && !loading;

  const subtitle = useMemo(() => {
    if (step === 1) return "We'll tailor the demo to your setup.";
    if (step === 2) return 'This helps us show you a relevant scale of fraud patterns.';
    return "We'll lead with the patterns most relevant to you.";
  }, [step]);

  const heading = step === 1
    ? 'What platform are you selling on?'
    : step === 2
      ? 'How many orders do you process per month?'
      : "What's your biggest headache right now?";

  function goBack() {
    if (!canGoBack) return;
    if (step === 2) {
      setStep(1);
      setShowHighVolumeFork(false);
      return;
    }
    setStep(2);
  }

  function onStartAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Enter your work email to continue.');
      return;
    }

    setEmailError('');
    setStep(1);
  }

  async function onSelectProblem(value: string) {
    setProblem(value);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const params = new URLSearchParams({
      email: email.trim(),
      platform,
      volume,
      problem: value,
    });
    router.push(`/audit-demo/results?${params.toString()}`);
  }

  return (
    <main
      className="min-h-screen px-6 py-10 md:py-16"
      style={{
        background:
          'radial-gradient(circle at top, rgba(123,45,38,0.08), transparent 32%), var(--landing-bg, #f8f5ee)',
        color: 'var(--landing-ink, #1f1a15)',
      }}
    >
      <div
        className="mx-auto w-full max-w-[560px]"
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid var(--landing-border, #d9d0c1)',
          borderRadius: '18px',
          boxShadow: '0 24px 64px -36px rgba(26,24,20,0.24)',
          padding: 'clamp(24px, 4vw, 40px)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            color: 'var(--landing-ink-tertiary, #74685c)',
            marginBottom: '12px',
          }}
        >
          {step === 0 ? 'Free audit demo' : `Step ${step} of 3`}
        </p>

        {step > 0 ? <ProgressBar step={step} /> : null}

        {canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              marginBottom: '18px',
              color: 'var(--landing-ink-secondary, #574d43)',
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '13px',
            }}
            className="hover:underline"
          >
            ← Back
          </button>
        ) : null}

        <div style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 180ms ease' }}>
          {step === 0 ? (
            <>
              <h1
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'var(--landing-ink, #1f1a15)',
                  marginBottom: '12px',
                }}
              >
                See what&apos;s hiding in your data.
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '16px',
                  color: 'var(--landing-ink-secondary, #574d43)',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                Start with your work email and we&apos;ll tailor a quick audit walkthrough to your store.
              </p>

              <form onSubmit={onStartAudit} className="grid grid-cols-1 gap-3">
                <Input
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@yourstore.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className="h-12 rounded-[14px] border-[var(--landing-border)] bg-white px-4 text-[15px] text-[var(--landing-ink)] placeholder:text-[var(--landing-ink-tertiary)]"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 rounded-[14px] normal-case tracking-normal"
                  style={{
                    background: 'var(--landing-accent)',
                    borderColor: 'var(--landing-accent)',
                    color: 'var(--landing-accent-fg)',
                  }}
                >
                  Run a free audit →
                </Button>
              </form>

              {emailError ? (
                <p
                  style={{
                    marginTop: '10px',
                    fontFamily: 'var(--font-dm-sans, sans-serif)',
                    fontSize: '13px',
                    color: 'var(--landing-accent, #7b2d26)',
                  }}
                >
                  {emailError}
                </p>
              ) : null}
            </>
          ) : null}

          {step > 0 ? (
            <>
              <h1
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'var(--landing-ink, #1f1a15)',
                  marginBottom: '12px',
                }}
              >
                {heading}
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '16px',
                  color: 'var(--landing-ink-secondary, #574d43)',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                {subtitle}
              </p>

              {loading ? (
                <p style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '15px', color: 'var(--landing-ink-secondary, #574d43)' }}>
                  Building your audit demo...
                </p>
              ) : null}

              {!loading && step === 1 ? (
                <div className="grid grid-cols-1 gap-3">
                  {platformOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      label={option.label}
                      selected={platform === option.value}
                      onClick={() => {
                        setPlatform(option.value);
                        setStep(2);
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {!loading && step === 2 ? (
                <div className="grid grid-cols-1 gap-3">
                  {volumeOptions.map((option) => {
                    const selected = volume === option.value;
                    const isHigh = option.value === '50000plus';
                    return (
                      <div key={option.value}>
                        <OptionCard
                          label={option.label}
                          selected={selected}
                          onClick={() => {
                            setVolume(option.value);
                            if (isHigh) {
                              setShowHighVolumeFork(true);
                              return;
                            }
                            setShowHighVolumeFork(false);
                            setStep(3);
                          }}
                        />
                        {isHigh && selected && showHighVolumeFork ? (
                          <div
                            style={{
                              border: '1px solid var(--landing-border, #d9d0c1)',
                              borderTop: 'none',
                              borderBottomLeftRadius: '14px',
                              borderBottomRightRadius: '14px',
                              padding: '14px 16px 16px',
                              background: 'var(--landing-surface-warm, #fdfbf6)',
                            }}
                          >
                            <p
                              style={{
                                fontFamily: 'var(--font-serif, serif)',
                                fontSize: '14px',
                                color: 'var(--landing-ink-secondary, #574d43)',
                                lineHeight: 1.45,
                                marginBottom: '12px',
                              }}
                            >
                              At your volume, fraud patterns are more complex and a generic demo won&apos;t do it justice.
                            </p>
                            <a
                              href="https://cal.example.com"
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                padding: '11px 14px',
                                background: 'var(--landing-accent, #7b2d26)',
                                color: 'var(--landing-bg, #f8f5ee)',
                                border: '1px solid var(--landing-accent, #7b2d26)',
                                borderRadius: '14px',
                                fontFamily: 'var(--font-dm-sans, sans-serif)',
                                fontSize: '14px',
                                fontWeight: 500,
                                textDecoration: 'none',
                              }}
                              className="hover:bg-[var(--landing-accent-hover,#60231e)]"
                            >
                              Book a 20-minute call →
                            </a>
                            <button
                              type="button"
                              onClick={() => setStep(3)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                marginTop: '10px',
                                padding: 0,
                                color: 'var(--landing-ink-tertiary, #74685c)',
                                fontFamily: 'var(--font-dm-sans, sans-serif)',
                                fontSize: '13px',
                                textDecoration: 'underline',
                              }}
                            >
                              continue to the demo anyway →
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {!loading && step === 3 ? (
                <div className="grid grid-cols-1 gap-3">
                  {problemOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      label={option.label}
                      selected={problem === option.value}
                      onClick={() => onSelectProblem(option.value)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
