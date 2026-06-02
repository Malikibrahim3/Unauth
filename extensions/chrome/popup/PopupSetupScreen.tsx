import { PopupHeader } from './PopupHeader';

type PopupSetupScreenProps = {
  setupKey: string;
  errorText: string;
  saving: boolean;
  onSetupKeyChange: (value: string) => void;
  onSave: () => void;
};

export function PopupSetupScreen({
  setupKey,
  errorText,
  saving,
  onSetupKeyChange,
  onSave,
}: PopupSetupScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected={false} showSettings={false} onSettings={() => {}} />
      <div className="body">
        <label className="label" htmlFor="api-key">
          Enter your API key
        </label>
        <input
          id="api-key"
          className="input"
          type="password"
          autoComplete="off"
          placeholder="unauth_sk_…"
          value={setupKey}
          onChange={(e) => onSetupKeyChange(e.target.value)}
        />
        <p className="helper">Find your key in Unauth → Settings → API &amp; Integrations</p>
        {errorText && <div className="error-box">{errorText}</div>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || !setupKey.trim()}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save key'}
        </button>
        <p className="helper">
          Don&apos;t have an account?{' '}
          <a className="link" href="https://unauth.co" target="_blank" rel="noreferrer">
            Sign up at unauth.co
          </a>
        </p>
      </div>
    </div>
  );
}
