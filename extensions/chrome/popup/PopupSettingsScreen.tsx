import { maskApiKey } from './risk';
import { PopupHeader } from './PopupHeader';

type PopupSettingsScreenProps = {
  apiKey: string;
  onUpdateKey: () => void;
  onDisconnect: () => void;
  onBack: () => void;
};

export function PopupSettingsScreen({
  apiKey,
  onUpdateKey,
  onDisconnect,
  onBack,
}: PopupSettingsScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected showSettings={false} onSettings={() => {}} />
      <div className="body">
        <p className="section-title">API key</p>
        <div className="settings-key">{maskApiKey(apiKey)}</div>
        <button type="button" className="btn btn-ghost" onClick={onUpdateKey}>
          Update API key
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDisconnect}>
          Disconnect
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}
