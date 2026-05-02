import Link from 'next/link';
import { Upload, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function EmptyDashboardHero() {
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'linear-gradient(135deg, #0A0F1E 0%, #111827 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h2 className="font-semibold mb-2" style={{ fontSize: '24px', color: 'var(--text)' }}>
          Run your first identity audit
        </h2>
        <p className="text-sm leading-relaxed mb-6 max-w-xl" style={{ color: 'var(--text-muted)' }}>
          Upload a CSV of your orders. We&apos;ll identify customers who appear to be operating
          multiple accounts and generate evidence you can use in chargeback disputes.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold"
            style={{ background: '#6366F1', color: '#fff' }}
          >
            <Upload className="h-4 w-4" />
            Upload a CSV
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium"
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            View sample audit
          </Link>
        </div>
      </div>

      {/* Two-column info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What you'll get */}
        <div
          className="rounded-xl p-6 space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            What you&apos;ll get
          </h3>
          <ul className="space-y-2.5">
            {[
              'Customers graded by confidence level (definite / probable / possible)',
              'A timeline of each customer\'s order history',
              'Cross-merchant indicators (when applicable)',
              'A downloadable PDF evidence package for any disputed order',
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
                <span className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What we need */}
        <div
          className="rounded-xl p-6 space-y-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            What we need
          </h3>
          <ul className="space-y-2">
            {[
              { text: 'Order ID, date, customer email, and order value', note: 'required' },
              { text: 'Refund status and refund date', note: 'recommended' },
              { text: 'Phone, shipping address, payment details', note: 'optional — improves accuracy' },
              { text: 'Any CSV from any platform — Shopify, WooCommerce, Magento, custom', note: null },
            ].map(({ text, note }) => (
              <li key={text} className="flex gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="shrink-0 mt-0.5">•</span>
                <span>
                  {text}
                  {note && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                      ({note})
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/help/csv-export"
            className="inline-block text-xs underline underline-offset-2 mt-1"
            style={{ color: 'var(--text-subtle)' }}
          >
            View full CSV guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
