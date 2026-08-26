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
        <label htmlFor="gorgias-api-email" className="block ua-text-label mb-1">
          Gorgias API email
        </label>
        <input
          id="gorgias-api-email"
          required={required}
          type="email"
          className="w-full rounded-md px-3 py-2 ua-text-body"
          style={{
            background: 'var(--uo-route-surface-secondary)',
            border: '1px solid var(--uo-route-border-default)',
            color: 'var(--uo-route-text-primary)',
          }}
          placeholder="you@company.com"
          value={gorgiasApiEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 ua-text-caption-role">
          The email you use to log into Gorgias.
        </p>
      </div>
      <div>
        <p className="mb-2 ua-text-caption-role leading-relaxed">
          Your API key is stored encrypted and used only to connect Gorgias to Unauth. It is never shown to other merchants.
        </p>
        <label htmlFor="gorgias-api-key" className="block ua-text-label mb-1">
          Gorgias API key
        </label>
        <input
          id="gorgias-api-key"
          required={required}
          type="password"
          className="w-full rounded-md px-3 py-2 ua-text-body font-mono"
          style={{
            background: 'var(--uo-route-surface-secondary)',
            border: '1px solid var(--uo-route-border-default)',
            color: 'var(--uo-route-text-primary)',
          }}
          placeholder="Your REST API key"
          value={gorgiasApiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 ua-text-caption-role">
          Found in Gorgias under Settings, then REST API, then API key (password).
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onToggleCredHelp}
          className="text-xs underline"
          style={{ color: 'var(--uo-route-action-primary)' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="mt-2 ua-text-caption-role leading-relaxed">
            In Gorgias, open <strong>Settings, then REST API</strong>. The API email is the address you
            log in with; the API key is the value labelled <strong>API key (password)</strong>.
            Unauth uses them once to register the sidebar widget, then stores them encrypted so it
            can keep your tickets in sync.
          </p>
        )}
      </div>
    </>
  );
}
