import { PopupHeader } from './PopupHeader';

type PopupLookupLoadingScreenProps = {
  connected: boolean;
};

export function PopupLookupLoadingScreen({ connected }: PopupLookupLoadingScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected={connected} showSettings={false} onSettings={() => {}} />
      <div className="loading">
        <img className="loading-logo" src="../icons/icon48.png" alt="" />
        <p>Checking customer context…</p>
      </div>
    </div>
  );
}
