'use client';

type GorgiasCredentialFieldsProps = {
  required: boolean;
  canManage: boolean;
  busy: boolean;
  gorgiasApiEmail: string;
  gorgiasApiKey: string;
  showCredHelp: boolean;
  onEmailChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onToggleCredHelp: () => void;
};

export function GorgiasCredentialFields({
  required,
  canManage,
  busy,
  gorgiasApiEmail,
  gorgiasApiKey,
  showCredHelp,
  onEmailChange,
  onApiKeyChange,
  onToggleCredHelp,
}: GorgiasCredentialFieldsProps) {
  return (
    <>
      <div>
        <label htmlFor="gorgias-api-email" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Gorgias API email
        </label>
        <input
          id="gorgias-api-email"
          required={required}
          type="email"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          placeholder="you@company.com"
          value={gorgiasApiEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          The email you use to log into Gorgias.
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Your API key is stored encrypted and used only to connect Gorgias to Unauth. It is never shown to other merchants.
        </p>
        <label htmlFor="gorgias-api-key" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          Gorgias API key
        </label>
        <input
          id="gorgias-api-key"
          required={required}
          type="password"
          className="w-full rounded-md px-3 py-2 text-sm font-mono"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
          placeholder="Your REST API key"
          value={gorgiasApiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Found in Gorgias under Settings → REST API → API key (password).
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onToggleCredHelp}
          className="text-xs underline"
          style={{ color: 'var(--accent)' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            In Gorgias, open <strong>Settings → REST API</strong>. The API email is the address you
            log in with; the API key is the value labelled <strong>API key (password)</strong>.
            Unauth uses them once to register the sidebar widget, then stores them encrypted so it
            can keep your tickets in sync.
          </p>
        )}
      </div>
    </>
  );
}
