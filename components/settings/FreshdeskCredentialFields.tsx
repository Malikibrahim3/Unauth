'use client';

type FreshdeskCredentialFieldsProps = {
  required: boolean;
  canManage: boolean;
  busy: boolean;
  freshdeskApiKey: string;
  showCredHelp: boolean;
  onApiKeyChange: (value: string) => void;
  onToggleCredHelp: () => void;
};

export function FreshdeskCredentialFields({
  required,
  canManage,
  busy,
  freshdeskApiKey,
  showCredHelp,
  onApiKeyChange,
  onToggleCredHelp,
}: FreshdeskCredentialFieldsProps) {
  return (
    <>
      <div>
        <p className="ua-text-caption-role mb-2 leading-relaxed" style={{ color: 'var(--uo-route-text-secondary)' }}>
          Your API key is stored encrypted and used only to validate your account and fetch ticket
          details when needed.
        </p>
        <label
          htmlFor="freshdesk-api-key"
          className="ua-text-label block mb-1"
          style={{ color: 'var(--uo-route-text-secondary)' }}
        >
          Freshdesk API key
        </label>
        <input
          id="freshdesk-api-key"
          required={required}
          type="password"
          className="ua-text-body w-full rounded-md px-3 py-2 font-mono"
          style={{
            background: 'var(--uo-route-surface-secondary)',
            border: '1px solid var(--uo-route-border-default)',
            color: 'var(--uo-route-text-primary)',
          }}
          placeholder="Your API key"
          value={freshdeskApiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={onToggleCredHelp}
          className="ua-text-label underline"
          style={{ color: 'var(--uo-route-action-primary)' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="ua-text-caption-role mt-2 leading-relaxed" style={{ color: 'var(--uo-route-text-secondary)' }}>
            In Freshdesk, open <strong>Profile Settings</strong> (avatar), then <strong>View profile</strong>{' '}
           , then your API key is listed on the right. You need an admin or agent profile with API access.
          </p>
        )}
      </div>
    </>
  );
}
