import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import ApiIntegrationsClient from '@/components/settings/ApiIntegrationsClient';

export default function ApiIntegrationsSettingsPage() {
  return (
    <div className="space-y-8 p-8 max-w-2xl">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Settings
        </Link>
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            API &amp; Integrations
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage API keys for external apps and preview upcoming integrations.
        </p>
      </div>

      <ApiIntegrationsClient />
    </div>
  );
}
