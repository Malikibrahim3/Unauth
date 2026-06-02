import { PopupHeader } from './PopupHeader';

type PopupLookupScreenProps = {
  email: string;
  name: string;
  orderId: string;
  address: string;
  showOptional: boolean;
  checking: boolean;
  onSettings: () => void;
  onEmailChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOrderIdChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onToggleOptional: () => void;
  onLookup: () => void;
};

export function PopupLookupScreen({
  email,
  name,
  orderId,
  address,
  showOptional,
  checking,
  onSettings,
  onEmailChange,
  onNameChange,
  onOrderIdChange,
  onAddressChange,
  onToggleOptional,
  onLookup,
}: PopupLookupScreenProps) {
  return (
    <div className="app">
      <PopupHeader connected showSettings onSettings={onSettings} />
      <div className="body">
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="off"
          placeholder="customer@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />

        <button type="button" className="expand-toggle" onClick={onToggleOptional}>
          {showOptional ? '− Hide optional fields' : '+ Add name or order ID'}
        </button>

        {showOptional && (
          <div className="optional-fields">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="order-id">
                Order ID
              </label>
              <input
                id="order-id"
                className="input"
                value={orderId}
                onChange={(e) => onOrderIdChange(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                className="input"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={checking || !email.trim()}
          onClick={onLookup}
        >
          Check customer
        </button>
      </div>
    </div>
  );
}
