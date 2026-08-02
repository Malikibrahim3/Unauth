import type { ReactNode } from 'react';
import Image from 'next/image';
import { CheckCircle2, CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { InsetGroup, Surface } from '@/components/ui';

type ConnectorStage = 'prepare' | 'connect' | 'verify';
type ConnectorNoticeTone = 'success' | 'warning' | 'error';

type ConnectorSetupShellProps = {
  provider: string;
  providerMark?: string;
  requirements: ReactNode;
  currentStage?: ConnectorStage;
  children: ReactNode;
};

const SETUP_STAGES: Array<{ id: ConnectorStage; label: string; detail: string }> = [
  { id: 'prepare', label: 'Requirements', detail: 'Confirm the account access and information needed to connect.' },
  { id: 'connect', label: 'Connect', detail: 'Authorize the provider or enter credentials securely.' },
  { id: 'verify', label: 'Verify', detail: 'Test the connection and resolve any provider-specific follow-up.' },
];

const NOTICE_TOKENS: Record<ConnectorNoticeTone, { background: string; borderColor: string; color: string }> = {
  success: {
    background: 'var(--ua-success-bg)',
    borderColor: 'var(--ua-success-border)',
    color: 'var(--ua-success)',
  },
  warning: {
    background: 'var(--ua-warning-bg)',
    borderColor: 'var(--ua-warning-border)',
    color: 'var(--ua-warning)',
  },
  error: {
    background: 'var(--ua-critical-bg)',
    borderColor: 'var(--ua-critical-border)',
    color: 'var(--ua-critical)',
  },
};

export function ConnectorSetupNotice({ tone, children }: { tone: ConnectorNoticeTone; children: ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : tone === 'warning' ? CircleDashed : CircleCheck;

  return (
    <output
      className="ua-text-body flex items-start gap-2 border px-4 py-3"
      role={tone === 'error' ? 'alert' : 'status'}
      style={NOTICE_TOKENS[tone]}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span style={{ color: 'var(--ua-text-primary)' }}>{children}</span>
    </output>
  );
}

/** Shared visual anatomy for provider setup; the setup action remains provider-owned. */
export function ConnectorSetupShell({
  provider,
  providerMark,
  requirements,
  currentStage = 'connect',
  children,
}: ConnectorSetupShellProps) {
  const currentIndex = SETUP_STAGES.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="space-y-4" data-testid="connector-setup-shell">
      <div className="flex items-center gap-3">
        {providerMark ? (
          <Image
            src={providerMark}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] object-contain p-1"
          />
        ) : (
          <div className="ua-text-working-title flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)]" style={{ color: 'var(--ua-text-primary)' }}>
            {provider.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{provider} connection</p>
          <p className="ua-text-caption-role mt-0.5">Complete the provider-specific steps below. Unauth only stores the information required to operate this connection.</p>
        </div>
      </div>

      <InsetGroup className="px-4 py-3">
        <p className="ua-text-label" style={{ color: 'var(--ua-text-primary)' }}>Before you connect</p>
        <div className="ua-text-caption-role mt-1 leading-5">{requirements}</div>
      </InsetGroup>

      <ol className="grid gap-2 sm:grid-cols-3" aria-label={`${provider} setup progress`}>
        {SETUP_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          return (
            <li
              key={stage.id}
              className="flex gap-2 rounded-[var(--ua-radius-control)] border px-3 py-2"
              style={{
                borderColor: isCurrent ? 'var(--ua-accent-200)' : 'var(--ua-border-subtle)',
                background: isCurrent ? 'var(--ua-accent-50)' : 'var(--ua-surface-primary)',
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isComplete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--ua-success)' }} aria-hidden="true" />
              ) : (
                <span className="ua-text-label mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ background: isCurrent ? 'var(--ua-accent-500)' : 'var(--ua-surface-muted)', color: isCurrent ? 'var(--ua-accent-fg)' : 'var(--ua-text-secondary)' }}>{index + 1}</span>
              )}
              <span>
                <span className="ua-text-label block" style={{ color: 'var(--ua-text-primary)' }}>{stage.label}</span>
                <span className="ua-text-caption-role block leading-4" style={{ color: 'var(--ua-text-secondary)' }}>{stage.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <Surface structure="unframed" className="space-y-4">
        {children}
      </Surface>
    </div>
  );
}
