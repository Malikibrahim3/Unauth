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
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] mb-2 leading-relaxed" style={{ color: '#64686d' }}>
          Your API key is stored encrypted and used only to validate your account and fetch ticket
          details when needed.
        </p>
        <label
          htmlFor="freshdesk-api-key"
          className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1"
          style={{ color: '#64686d' }}
        >
          Freshdesk API key
        </label>
        <input
          id="freshdesk-api-key"
          required={required}
          type="password"
          className="text-[13px] leading-5 text-[#40454a] w-full rounded-md px-3 py-2 font-mono"
          style={{
            background: '#f4f3f1',
            border: '1px solid #e4e3e0',
            color: '#1c1f23',
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
          className="text-[11px] font-medium leading-4 text-[#64686d] underline"
          style={{ color: '#9f4f08' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-2 leading-relaxed" style={{ color: '#64686d' }}>
            In Freshdesk, open <strong>Profile Settings</strong> (avatar), then <strong>View profile</strong>{' '}
           , then your API key is listed on the right. You need an admin or agent profile with API access.
          </p>
        )}
      </div>
    </>
  );
}
