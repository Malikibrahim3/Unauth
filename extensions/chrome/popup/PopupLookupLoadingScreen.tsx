import { PopupHeader } from './PopupHeader';

type PopupLookupLoadingScreenProps = {
  connected: boolean;
};

export function PopupLookupLoadingScreen({ connected }: PopupLookupLoadingScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected={connected} showSettings={false} onSettings={() => {}} />
      <div className="loading">
        <div className="loading-logo">U</div>
        <p>Checking customer context…</p>
      </div>
    </div>
  );
}
