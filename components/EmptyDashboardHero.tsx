import Link from 'next/link';
import { Upload, ArrowRight, ShoppingBag, Headphones, ShieldCheck, Users, BarChart3, FileText } from 'lucide-react';

function ShopifyMark() {
  // Simplified Shopify-style shopping bag silhouette in their green
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#96BF48" />
      <path d="M27.5 13.2c0-.1-.1-.2-.2-.2-.1 0-2.2-.2-2.2-.2s-1.5-1.5-1.6-1.6c-.2-.2-.5-.1-.6-.1l-.9.3c-.2-.5-.5-1-.9-1.4-.6-.6-1.4-.9-2.1-.9h-.1c-.3-.3-.6-.5-1-.5-2.5 0-3.7 3.1-4.1 4.6l-2.2.7c-.7.2-.7.2-.7.9L10 27l10 1.9 5.4-1.2c0-.1 2.2-14.3 2.1-14.5zM22 11.6l-1.4.4c0-.2 0-.3.1-.5.4-1.1.9-1.7 1.3-2.1v2.2zm-2-.5c-.3.2-.7.8-1 1.8l-1.1.3c.4-1.2 1.1-2.4 2.1-2.6v.5zm0-1c-.1 0-.1 0 0 0-.8.1-1.8 1.2-2.3 3l-1.6.5c.5-1.8 1.7-4.8 3.9-4.8v1.3z" fill="white"/>
    </svg>
  );
}

function GorgiasZendeskMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8" aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#7B2D26" />
      <path d="M20 10c-5.5 0-10 4.5-10 10s4.5 10 10 10h10V20c0-5.5-4.5-10-10-10zm0 15c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="white"/>
    </svg>
  );
}

function PreviewRow({ email, grade, orders, claims, gradeColor }: { email: string; grade: string; orders: number; claims: number; gradeColor: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
      <span className="font-mono truncate max-w-[140px]" style={{ color: 'var(--ink-secondary)' }}>{email}</span>
      <span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</span>
      <span style={{ color: 'var(--ink-tertiary)' }}>{orders} orders</span>
      <span style={{ color: claims > 0 ? 'var(--sev-high, #DC2626)' : 'var(--ink-tertiary)' }}>{claims} claims</span>
    </div>
  );
}

export default function EmptyDashboardHero() {
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Headline */}
      <div>
        <h2 className="font-semibold mb-1.5" style={{ fontSize: '20px', color: 'var(--ink-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Connect Shopify and your helpdesk to get started
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          Unauth needs both. Shopify provides order data — your helpdesk provides claim history. One without the other is an incomplete picture.
        </p>
      </div>

      {/* Integration flow visual */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-3">
          {/* Shopify card */}
          <Link
            href="/settings/integrations"
            className="flex-1 rounded-lg p-4 transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <ShopifyMark />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--ink-tertiary)' }}>Required</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Shopify</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
              Syncs orders, identity signals, and purchase history automatically.
            </p>
          </Link>

          {/* Plus connector */}
          <div className="flex flex-col items-center gap-1 px-1">
            <div className="h-px w-6" style={{ background: 'var(--border-default)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--ink-tertiary)' }}>+</span>
            <div className="h-px w-6" style={{ background: 'var(--border-default)' }} />
          </div>

          {/* Helpdesk card */}
          <Link
            href="/settings/integrations"
            className="flex-1 rounded-lg p-4 transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <GorgiasZendeskMark />
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--ink-tertiary)' }}>Required</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Gorgias or Zendesk</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>
              Pulls in claim history, dispute signals, and support ticket context.
            </p>
          </Link>

          {/* Arrow to preview */}
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-tertiary)' }} />

          {/* What you get — mini preview */}
          <div
            className="flex-1 rounded-lg overflow-hidden"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)' }}
          >
            <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-overlay)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-tertiary)' }}>Your customers</p>
            </div>
            <PreviewRow email="jane@acme.co" grade="A" orders={14} claims={3} gradeColor="#7B2D26" />
            <PreviewRow email="anon+1032@gmail.com" grade="B" orders={7} claims={1} gradeColor="#B45309" />
            <PreviewRow email="test.buyer@shop.io" grade="D" orders={2} claims={0} gradeColor="#6B7280" />
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
            className="rounded-lg p-3 space-y-1.5"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
          >
            <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--ink-primary)' }}>{label}</p>
            <p className="text-[11px]" style={{ color: 'var(--ink-tertiary)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary — CSV */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
        style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Upload className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-tertiary)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>Not ready to connect yet?</p>
            <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
              Upload a CSV export to explore what Unauth surfaces — integrations can be added later.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/upload?welcome=1"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', color: 'var(--ink-primary)' }}
          >
            Upload CSV
          </Link>
          <Link href="/demo" className="text-sm font-medium hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
            View sample →
          </Link>
        </div>
      </div>
    </div>
  );
}
