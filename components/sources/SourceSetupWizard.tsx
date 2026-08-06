'use client';

import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button, StatusBadge } from '@/components/ui';
import { ConnectionActions } from '@/components/integrations/ConnectionActions';

type Capability = { id: string; description: string; support: string };

const STEPS = [
  ['provider', 'Provider'],
  ['permissions', 'Permissions'],
  ['mapping', 'Field mapping'],
  ['history', 'Historical scope'],
  ['schedule', 'Sync schedule'],
  ['review', 'Test & review'],
  ['activate', 'Activate'],
] as const;

type StepId = (typeof STEPS)[number][0];

export function SourceSetupWizard({
  providerId,
  providerName,
  status,
  description,
  capabilities,
  canManage,
}: {
  providerId: string;
  providerName: string;
  status: string;
  description: string;
  capabilities: Capability[];
  canManage: boolean;
}) {
  const [active, setActive] = useState<StepId>('provider');
  const activeIndex = STEPS.findIndex(([id]) => id === active);
  const next = () => setActive(STEPS[Math.min(activeIndex + 1, STEPS.length - 1)]![0]);
  const previous = () => setActive(STEPS[Math.max(activeIndex - 1, 0)]![0]);

  return (
    <div className="space-y-5" data-testid="source-setup-wizard">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7" aria-label={`${providerName} setup steps`}>
        {STEPS.map(([id, label], index) => {
          const isCurrent = active === id;
          const isComplete = index < activeIndex;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActive(id)}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex w-full items-center gap-2 rounded-[var(--ua-radius-control)] border px-3 py-2 text-left"
                style={{
                  borderColor: isCurrent ? 'var(--ua-accent-300)' : 'var(--ua-border-subtle)',
                  background: isCurrent ? 'var(--ua-accent-50)' : 'var(--ua-surface-primary)',
                }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[length:var(--ua-text-metadata-size)] font-semibold" style={{ background: isComplete ? 'var(--ua-success)' : isCurrent ? 'var(--ua-accent-500)' : 'var(--ua-surface-muted)', color: isComplete || isCurrent ? 'var(--ua-text-inverse)' : 'var(--ua-text-secondary)' }}>
                  {isComplete ? <Check size={13} aria-hidden="true" /> : index + 1}
                </span>
                <span className="ua-text-label truncate text-[var(--ua-text-primary)]">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <section className="min-h-72 border-y border-[var(--ua-border-subtle)] py-5" aria-live="polite">
        {active === 'provider' ? (
          <SetupSection title={`Connect ${providerName}`} detail={description}>
            <div className="flex items-center gap-3"><StatusBadge family="workflowStatus" value={status} /><p className="ua-text-caption-role">The provider and capability contract are selected before any credentials or records are accepted.</p></div>
          </SetupSection>
        ) : null}
        {active === 'permissions' ? (
          <SetupSection title="Confirm permissions" detail="Review the provider-owned permission prompt before authorizing access.">
            <div className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-[var(--ua-action-700)]" /><p className="ua-text-working-title">Least-privilege connection</p></div><p className="ua-text-caption-role mt-2">Unauth requests only the capabilities listed for this source. Credential values are never displayed after submission.</p></div>
          </SetupSection>
        ) : null}
        {active === 'mapping' ? (
          <SetupSection title="Verify field mapping" detail="Mappings are visible before activation. Unsupported fields are left unclaimed rather than inferred.">
            <ul className="divide-y divide-[var(--ua-border-subtle)] rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)]">{capabilities.length ? capabilities.map((capability) => <li key={capability.id} className="flex items-center justify-between gap-3 px-4 py-3"><span className="ua-text-body text-[var(--ua-text-primary)]">{capability.description}</span><StatusBadge family="workflowStatus" value={capability.support} size="sm" /></li>) : <li className="ua-text-caption-role p-4">This provider has no published mapping contract yet.</li>}</ul>
          </SetupSection>
        ) : null}
        {active === 'history' ? (
          <SetupSection title="Set historical scope" detail="Initial imports remain bounded, attributable, and observable.">
            <p className="ua-text-body text-[var(--ua-text-secondary)]">Historical scope is confirmed by the provider-specific connection flow. Until it completes, the source remains connected but coverage is not presented as complete.</p>
          </SetupSection>
        ) : null}
        {active === 'schedule' ? (
          <SetupSection title="Review sync schedule" detail="Delivery is documented as event-driven, scheduled, or on-demand by the source contract.">
            <p className="ua-text-body text-[var(--ua-text-secondary)]">The current status is <strong className="text-[var(--ua-text-primary)]">{status.replaceAll('_', ' ')}</strong>. Freshness and failures continue to be shown in the source detail after activation.</p>
          </SetupSection>
        ) : null}
        {active === 'review' ? (
          <SetupSection title="Test and review" detail="Verify the connection, mapping contract, scope, and data health before turning the source on.">
            <p className="ua-text-body text-[var(--ua-text-secondary)]">Activation remains explicit. A successful connection does not imply complete history or current freshness; those are reported separately on the source detail.</p>
          </SetupSection>
        ) : null}
        {active === 'activate' ? (
          <SetupSection title="Activate source" detail="The provider action below is the only step that changes connection state.">
            <ConnectionActions providerId={providerId} providerName={providerName} status={status} canManage={canManage} />
          </SetupSection>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={previous} disabled={activeIndex === 0} leadingIcon={<ChevronLeft size={15} />}>Back</Button>
        {activeIndex < STEPS.length - 1 ? <Button variant="primary" size="sm" onClick={next}>Continue <ChevronRight size={15} aria-hidden="true" /></Button> : null}
      </div>
    </div>
  );
}

function SetupSection({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return <div className="max-w-3xl"><h2 className="text-h3 text-[var(--ua-text-primary)]">{title}</h2><p className="mt-2 text-body text-[var(--ua-text-secondary)]">{detail}</p><div className="mt-5">{children}</div></div>;
}
