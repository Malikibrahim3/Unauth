import { PopupHeader } from './PopupHeader';

type PopupErrorScreenProps = {
  connected: boolean;
  errorText: string;
  onSettings: () => void;
  onRetry: () => void;
};

export function PopupErrorScreen({
  connected,
  errorText,
  onSettings,
  onRetry,
}: PopupErrorScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected={connected} showSettings onSettings={onSettings} />
      <div className="body">
        <div className="error-box">{errorText}</div>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
