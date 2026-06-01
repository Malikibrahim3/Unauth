import Link from 'next/link';
import { Store, MessageSquare, Upload, CheckCircle2, ChevronRight } from 'lucide-react';

export default function EmptyDashboardHero() {
  return (
    <div className="space-y-4">
      {/* Hero heading */}
      <div>
        <h2 className="font-semibold mb-1" style={{ fontSize: '22px', color: 'var(--text)' }}>
          Get started with Unauth
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Connect your store and helpdesk to start catching identity fraud automatically.
        </p>
      </div>

      {/* Primary path — two connection cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Step 1: Store */}
        <Link
          href="/settings/integrations"
          className="group relative rounded-xl overflow-hidden transition-opacity hover:opacity-90"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="h-1 w-full" style={{ background: 'var(--accent)' }} />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                <Store className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              </span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-subtle)' }}>Step 1</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect your store</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
              Link your Shopify store to sync orders automatically. No CSV exports — identity fraud detection runs on live data.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Set up Shopify <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* Step 2: Helpdesk */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="h-1 w-full" style={{ background: 'var(--sev-neutral)' }} />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, var(--sev-neutral) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--sev-neutral) 25%, transparent)' }}>
                <MessageSquare className="h-4 w-4" style={{ color: 'var(--sev-neutral)' }} />
              </span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-subtle)' }}>Step 2</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect your helpdesk</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
              Surface customer intelligence directly inside your tickets — no tab-switching.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/settings/integrations/gorgias"
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Gorgias →
              </Link>
              <Link
                href="/settings/integrations/zendesk"
                className="text-sm font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Zendesk →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* What you'll get */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>What you&apos;ll get</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {[
            'Customers graded by identity confidence (definite / probable / possible)',
            'A full timeline of each customer\'s order and claim history',
            'Cross-merchant indicators when the same identity appears elsewhere',
            'Downloadable evidence packages for chargeback disputes',
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
              <span className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Secondary path — CSV */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
        style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Upload className="h-4 w-4 shrink-0" style={{ color: 'var(--text-subtle)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Prefer to start with a CSV?</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Upload an order export from Shopify, WooCommerce, or any platform — no integration needed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/upload?welcome=1"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            Upload CSV
          </Link>
          <Link
            href="/demo"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            View sample →
          </Link>
        </div>
      </div>
    </div>
  );
}
