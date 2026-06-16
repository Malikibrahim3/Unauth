import Link from 'next/link';
import { ArrowRight, ShoppingBag, Headphones, ShieldCheck, Users, BarChart3, FileText } from 'lucide-react';
import { GradeBadge, type ConfidenceGradeValue } from '@/components/ui/GradeBadge';

function IntegrationMark({ type }: { type: 'shopify' | 'helpdesk' }) {
  const Icon = type === 'shopify' ? ShoppingBag : Headphones;
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-md"
      style={{
        background: type === 'shopify' ? 'var(--lime)' : 'var(--accent)',
        color: type === 'shopify' ? 'var(--lime-fg)' : 'white',
      }}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function PreviewRow({ email, grade, orders, claims }: { email: string; grade: ConfidenceGradeValue; orders: number; claims: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--border-muted)' }}>
      <span className="font-mono truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>{email}</span>
      <GradeBadge grade={grade} size="sm" compact />
      <span style={{ color: 'var(--text-tertiary)' }}>{orders} orders</span>
      <span style={{ color: claims > 0 ? 'var(--success)' : 'var(--text-tertiary)' }}>{claims} claims</span>
    </div>
  );
}

export default function EmptyDashboardHero() {
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Headline */}
      <div>
        <h2 className="text-h2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Connect Shopify and your helpdesk to get started
        </h2>
        <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Unauth needs both. Shopify provides order data - your helpdesk provides claim history. One without the other is an incomplete picture.
        </p>
      </div>

      {/* Integration flow visual */}
      <div
        className="rounded-md p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          {/* Shopify card */}
          <Link
            href="/settings/integrations"
            className="flex-1 rounded-md p-4 transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <IntegrationMark type="shopify" />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Required</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Shopify</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Syncs orders, identity signals, and purchase history automatically.
            </p>
          </Link>

          {/* Plus connector */}
          <div className="flex flex-col items-center gap-1 px-1">
            <div className="h-px w-6" style={{ background: 'var(--border)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>+</span>
            <div className="h-px w-6" style={{ background: 'var(--border)' }} />
          </div>

          {/* Helpdesk card */}
          <Link
            href="/settings/integrations"
            className="flex-1 rounded-md p-4 transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <IntegrationMark type="helpdesk" />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Required</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Gorgias or Zendesk</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Pulls in claim history, dispute signals, and support ticket context.
            </p>
          </Link>

          {/* Arrow to preview */}
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }} />

          {/* What you get - mini preview */}
          <div
            className="flex-1 rounded-md overflow-hidden"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border)' }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Your customers</p>
            </div>
            <PreviewRow email="hash:7c91e2a4" grade="A" orders={14} claims={3} />
            <PreviewRow email="hash:ae24f910" grade="B" orders={7} claims={1} />
            <PreviewRow email="hash:19bd440a" grade="D" orders={2} claims={0} />
          </div>
        </div>

        <div className="mt-4">
          <Link
            href="/settings/integrations"
            className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
          >
            Set up integrations
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Identity confidence grades', sub: 'Definite · Probable · Possible' },
          { icon: ShieldCheck, label: 'Evidence packages', sub: 'Export for disputes' },
          { icon: BarChart3, label: 'Claim rate analytics', sub: 'Per customer + network' },
          { icon: FileText, label: 'Helpdesk intelligence', sub: 'In-ticket without tab-switching' },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="rounded-md p-3 space-y-1.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Icon className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
