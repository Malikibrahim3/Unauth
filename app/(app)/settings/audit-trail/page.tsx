import Link from 'next/link';
import { ArrowLeft, Database, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { PrivacyBadge, SectionCard } from '@/components/ui';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';

const DATA_RULES = [
  {
    label: 'K-ANONYMITY GATE',
    value: 'k>=3',
    body: 'Network matches are only shown after aggregate presence clears the merchant-count threshold.',
  },
  {
    label: 'HASHED BEFORE MATCHING',
    value: 'HMAC-SHA256',
    body: 'Emails, payment tokens, IPs, and address keys are normalised and hashed before network comparison.',
  },
  {
    label: 'NEVER SHARED',
    value: '0 PII',
    body: 'Other merchant names, customer IDs, order IDs, and raw customer identifiers are not exposed.',
  },
];

const STORAGE_ROWS = [
  ['Stored', 'Order IDs, merchant-local customer labels, risk scores, aggregate signal evidence'],
  ['Hashed', 'Email, device, IP, card, phone, and address linkage keys where available'],
  ['Hidden', 'Other merchant identities, their customer records, their order IDs, and raw cross-merchant PII'],
  ['Retained', 'Audit runs and evidence packages until deleted by the merchant account owner'],
];

export default function DataPrivacySettingsPage() {
  return (
    <div className="max-w-5xl space-y-6 p-8">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--ink-secondary)' }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5" style={{ color: 'var(--privacy-ink)' }} />
          <h1 className="t-heading" style={{ color: 'var(--ink-primary)' }}>Data & privacy</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Review the controls behind privacy-safe network intelligence, hashed identifiers, and merchant-owned data retention.
        </p>
      </div>

      <SectionCard
        title="Privacy controls"
        description="The network graph exposes aggregate fraud presence without exposing another merchant's customer data."
        actions={<PrivacyBadge value="k-safe" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {DATA_RULES.map((rule) => (
            <div
              key={rule.label}
              className="rounded-md border p-4"
              style={{ borderColor: 'var(--privacy-border)', background: 'var(--privacy-fill)' }}
            >
              <p className="t-label" style={{ color: 'var(--privacy-ink)' }}>{rule.label}</p>
              <p className="t-mono-md num mt-3" style={{ color: 'var(--ink-primary)' }}>{rule.value}</p>
              <p className="t-caption mt-2" style={{ color: 'var(--ink-tertiary)' }}>{rule.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data handling" description="What is stored, hashed, hidden, and retained">
        <div className="overflow-hidden rounded-md border" style={{ borderColor: 'var(--surface-border)' }}>
          {STORAGE_ROWS.map(([label, description]) => (
            <div key={label} className="grid gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[160px_1fr]" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-2">
                {label === 'Stored' && <Database className="h-4 w-4" style={{ color: 'var(--data-id)' }} />}
                {label === 'Hashed' && <KeyRound className="h-4 w-4" style={{ color: 'var(--privacy-ink)' }} />}
                {label === 'Hidden' && <LockKeyhole className="h-4 w-4" style={{ color: 'var(--sev-clear)' }} />}
                {label === 'Retained' && <ShieldCheck className="h-4 w-4" style={{ color: 'var(--copper-bright)' }} />}
                <span className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{label}</span>
              </div>
              <p className="t-body" style={{ color: 'var(--ink-secondary)' }}>{description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Deletion controls" description="Owner-controlled removal for merchant-owned records">
        <BulkDeleteClient />
      </SectionCard>
    </div>
  );
}
