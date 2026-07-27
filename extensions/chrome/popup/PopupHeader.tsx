import { GearIcon } from './GearIcon';

type PopupHeaderProps = {
  connected: boolean;
  onSettings: () => void;
  showSettings: boolean;
};

export function PopupHeader({ connected, onSettings, showSettings }: PopupHeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <img className="brand-mark" src="../icons/icon48.png" alt="" />
        <div>
          <div className="brand-name">Unauth</div>
          {connected && (
            <span className="connected">
              <span className="connected-dot" />
              Connected
            </span>
          )}
        </div>
      </div>
      {showSettings && (
        <button type="button" className="icon-btn" onClick={onSettings} aria-label="Settings">
          <GearIcon />
        </button>
      )}
    </header>
  );
}
