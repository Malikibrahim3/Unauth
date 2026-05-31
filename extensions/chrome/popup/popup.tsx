import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { APP_ORIGIN } from '../shared/types';
import type { EvidenceResponse, LookupResponse } from '../shared/types';
import { claimsLine, maskApiKey, gradeVisualForLookup } from './risk';
import { errorMessage, sendMessage } from './messaging';

type Screen = 'setup' | 'lookup' | 'loading' | 'results' | 'error' | 'settings';

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19.4 13a7.97 7.97 0 0 0 .1-2l2-1.2-2-3.4-2.3 1a8.1 8.1 0 0 0-1.7-1L15 2h-6l-.5 2.4a8.1 8.1 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.2a7.97 7.97 0 0 0 .1 2l-2 1.2 2 3.4 2.3-1a8.1 8.1 0 0 0 1.7 1L9 22h6l.5-2.4a8.1 8.1 0 0 0 1.7-1l2.3 1 2-3.4-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header({
  connected,
  onSettings,
  showSettings,
}: {
  connected: boolean;
  onSettings: () => void;
  showSettings: boolean;
}) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          U
        </div>
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

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [setupKey, setSetupKey] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [address, setAddress] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [lastEmail, setLastEmail] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [errorText, setErrorText] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceOrderId, setEvidenceOrderId] = useState('');
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [evidenceError, setEvidenceError] = useState('');

  const bootstrap = useCallback(async () => {
    const state = await sendMessage({ type: 'GET_STATE' });
    if (!state.ok) {
      setScreen('error');
      setErrorText(state.error);
      return;
    }

    const key = state.apiKey ?? null;
    setApiKey(key);

    const detected = await sendMessage({ type: 'GET_DETECTED_EMAIL' });
    const prefill =
      (detected.ok && (detected.detectedEmail ?? detected.pendingEmail)) || state.detectedEmail;
    if (prefill) setEmail(prefill);

    setScreen(key ? 'lookup' : 'setup');
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function saveApiKey() {
    setSaving(true);
    setErrorText('');
    const res = await sendMessage({ type: 'SAVE_API_KEY', apiKey: setupKey.trim() });
    setSaving(false);
    if (!res.ok) {
      setErrorText(res.error);
      return;
    }
    setApiKey(setupKey.trim());
    setSetupKey('');
    setScreen('lookup');
  }

  async function disconnect() {
    await sendMessage({ type: 'CLEAR_API_KEY' });
    setApiKey(null);
    setLookup(null);
    setEvidence(null);
    setScreen('setup');
  }

  async function runLookup() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setChecking(true);
    setScreen('loading');
    setErrorText('');
    setEvidence(null);
    setEvidenceError('');
    setProfileUrl('');

    const res = await sendMessage({
      type: 'LOOKUP',
      email: trimmed,
      name: name.trim() || undefined,
      address: address.trim() || undefined,
    });

    setChecking(false);

    if (!res.ok || !res.lookup) {
      setScreen('error');
      setErrorText(errorMessage(res.code, res.error));
      return;
    }

    setLookup(res.lookup);
    setLastEmail(trimmed);
    setProfileUrl(res.profileUrl ?? '');
    if (orderId.trim()) setEvidenceOrderId(orderId.trim());
    setScreen('results');
  }

  async function runEvidence() {
    const oid = evidenceOrderId.trim() || orderId.trim();
    if (!oid || !lastEmail) {
      setEvidenceError('Order ID is required to generate evidence.');
      return;
    }
    setEvidenceLoading(true);
    setEvidenceError('');
    const res = await sendMessage({
      type: 'CREATE_EVIDENCE',
      email: lastEmail,
      orderId: oid,
    });
    setEvidenceLoading(false);
    if (!res.ok || !res.evidence) {
      setEvidenceError(errorMessage(res.code, res.error));
      return;
    }
    setEvidence(res.evidence);
    setShowEvidenceForm(false);
  }

  function openProfile() {
    const fallback = `${APP_ORIGIN}/customers`;
    chrome.tabs.create({ url: profileUrl || fallback });
  }

  if (screen === 'loading' && !checking && apiKey === null) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-logo">U</div>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (screen === 'settings' && apiKey) {
    return (
      <div className="app">
        <Header connected showSettings={false} onSettings={() => {}} />
        <div className="body">
          <p className="section-title">API key</p>
          <div className="settings-key">{maskApiKey(apiKey)}</div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSetupKey('');
              setScreen('setup');
            }}
          >
            Update API key
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void disconnect()}>
            Disconnect
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('lookup')}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'setup') {
    return (
      <div className="app">
        <Header connected={false} showSettings={false} onSettings={() => {}} />
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
            onChange={(e) => setSetupKey(e.target.value)}
          />
          <p className="helper">
            Find your key in Unauth → Settings → API &amp; Integrations
          </p>
          {errorText && <div className="error-box">{errorText}</div>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !setupKey.trim()}
            onClick={() => void saveApiKey()}
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

  if (screen === 'loading') {
    return (
      <div className="app">
        <Header connected={!!apiKey} showSettings={false} onSettings={() => {}} />
        <div className="loading">
          <div className="loading-logo">U</div>
          <p>Checking identity network…</p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="app">
        <Header connected={!!apiKey} showSettings onSettings={() => setScreen('settings')} />
        <div className="body">
          <div className="error-box">{errorText}</div>
          <button type="button" className="btn btn-primary" onClick={() => setScreen('lookup')}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'results' && lookup) {
    const visual = gradeVisualForLookup(lookup);
    const crossMerchant = lookup.claims_record.cross_merchant;
    return (
      <div className="app">
        <Header connected showSettings onSettings={() => setScreen('settings')} />
        <div className="body results">
          <div className={`grade-banner ${visual.className}`}>
            <h2>{visual.label}</h2>
            <div className="grade-meta">
              {lookup.matched_on.length > 0
                ? `Matched on ${lookup.matched_on.join(', ')}`
                : 'Identity match'}
            </div>
          </div>

          <div>
            <p className="section-title">Claims on record</p>
            <p style={{ margin: 0 }}>{claimsLine(lookup.claims_record)}</p>
          </div>

          {crossMerchant && (
            <div className="cross-merchant">
              <p className="section-title">Cross-merchant</p>
              <p style={{ margin: 0 }}>
                Seen at {crossMerchant.merchant_count} merchants
                <br />
                {crossMerchant.claim_count} total claims
              </p>
            </div>
          )}

          {lookup.ce3_evidence_available && (
            <div className="ce3">
              <p className="section-title">CE 3.0</p>
              <p style={{ margin: 0 }}>CE 3.0 evidence available</p>
            </div>
          )}

          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={openProfile}>
              View full profile →
            </button>

            {!showEvidenceForm && !evidence && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowEvidenceForm(true);
                  if (orderId.trim()) setEvidenceOrderId(orderId.trim());
                }}
              >
                Generate evidence PDF
              </button>
            )}

            {showEvidenceForm && !evidence && (
              <div className="evidence-form">
                <label className="label" htmlFor="evidence-order">
                  Order ID
                </label>
                <input
                  id="evidence-order"
                  className="input"
                  value={evidenceOrderId}
                  onChange={(e) => setEvidenceOrderId(e.target.value)}
                  placeholder="Shopify order ID or ref"
                />
                {evidenceError && <div className="error-box">{evidenceError}</div>}
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={evidenceLoading}
                  onClick={() => void runEvidence()}
                >
                  {evidenceLoading ? 'Generating…' : 'Generate PDF'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEvidenceForm(false)}
                >
                  Cancel
                </button>
              </div>
            )}

            {evidence && (
              <div className="evidence-success">
                <p>
                  <strong>{evidence.reference}</strong>
                  {evidence.has_prior_match_evidence ? ' · Prior identity match' : ''}
                </p>
                <a
                  className="link"
                  href={evidence.download_url || evidence.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF →
                </a>
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setLookup(null);
                setScreen('lookup');
              }}
            >
              New lookup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header connected showSettings onSettings={() => setScreen('settings')} />
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
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="button"
          className="expand-toggle"
          onClick={() => setShowOptional((v) => !v)}
        >
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
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setOrderId(e.target.value)}
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
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          disabled={checking || !email.trim()}
          onClick={() => void runLookup()}
        >
          Check customer
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
