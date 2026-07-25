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
        <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--ua-text-secondary)' }}>
          Your API key is stored encrypted and used only to validate your account and fetch ticket
          details when needed.
        </p>
        <label
          htmlFor="freshdesk-api-key"
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--ua-text-secondary)' }}
        >
          Freshdesk API key
        </label>
        <input
          id="freshdesk-api-key"
          required={required}
          type="password"
          className="w-full rounded-md px-3 py-2 text-sm font-mono"
          style={{
            background: 'var(--ua-surface-secondary)',
            border: '1px solid var(--ua-border-default)',
            color: 'var(--ua-text-primary)',
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
          className="text-xs underline"
          style={{ color: 'var(--ua-action-primary)' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--ua-text-secondary)' }}>
            In Freshdesk, open <strong>Profile Settings</strong> (avatar), then <strong>View profile</strong>{' '}
           , then your API key is listed on the right. You need an admin or agent profile with API access.
          </p>
        )}
      </div>
    </>
  );
}
