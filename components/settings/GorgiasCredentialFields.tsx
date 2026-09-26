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
        <label htmlFor="gorgias-api-email" className="block text-[11px] font-medium leading-4 text-[#64686d] mb-1">
          Gorgias API email
        </label>
        <input
          id="gorgias-api-email"
          required={required}
          type="email"
          className="w-full rounded-md px-3 py-2 text-[13px] leading-5 text-[#40454a]"
          style={{
            background: '#f4f3f1',
            border: '1px solid #e4e3e0',
            color: '#1c1f23',
          }}
          placeholder="you@company.com"
          value={gorgiasApiEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 text-[11.5px] leading-[1.45] text-[#64686d]">
          The email you use to log into Gorgias.
        </p>
      </div>
      <div>
        <p className="mb-2 text-[11.5px] leading-[1.45] text-[#64686d] leading-relaxed">
          Your API key is stored encrypted and used only to connect Gorgias to Unauth. It is never shown to other merchants.
        </p>
        <label htmlFor="gorgias-api-key" className="block text-[11px] font-medium leading-4 text-[#64686d] mb-1">
          Gorgias API key
        </label>
        <input
          id="gorgias-api-key"
          required={required}
          type="password"
          className="w-full rounded-md px-3 py-2 text-[13px] leading-5 text-[#40454a] font-mono"
          style={{
            background: '#f4f3f1',
            border: '1px solid #e4e3e0',
            color: '#1c1f23',
          }}
          placeholder="Your REST API key"
          value={gorgiasApiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          disabled={!canManage || busy}
          autoComplete="off"
        />
        <p className="mt-2 text-[11.5px] leading-[1.45] text-[#64686d]">
          Found in Gorgias under Settings, then REST API, then API key (password).
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onToggleCredHelp}
          className="text-xs underline"
          style={{ color: '#9f4f08' }}
        >
          Where do I find this?
        </button>
        {showCredHelp && (
          <p className="mt-2 text-[11.5px] leading-[1.45] text-[#64686d] leading-relaxed">
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
