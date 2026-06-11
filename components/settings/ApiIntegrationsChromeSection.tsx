import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function ApiIntegrationsChromeSection() {
  return (
    <section
      className="flex gap-3 rounded-md border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <Image
        src="/integrations/chrome.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md"
        style={{ objectFit: 'contain' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Chrome extension</p>
          <Link
            href="/settings/integrations/chrome"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Install
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Look up customers from any page with one click.
        </p>
      </div>
    </section>
  );
}
