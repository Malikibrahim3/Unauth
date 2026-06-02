import { useCallback, useEffect, useReducer, useRef } from 'react';
import { APP_ORIGIN } from '../shared/types';
import { errorMessage, sendMessage } from './messaging';
import { PopupBootstrapLoading } from './PopupBootstrapLoading';
import { PopupErrorScreen } from './PopupErrorScreen';
import { PopupLookupLoadingScreen } from './PopupLookupLoadingScreen';
import { PopupLookupScreen } from './PopupLookupScreen';
import { PopupResultsScreen } from './PopupResultsScreen';
import { PopupSettingsScreen } from './PopupSettingsScreen';
import { PopupSetupScreen } from './PopupSetupScreen';
import { initialPopupState, popupReducer } from './popupReducer';

export function App() {
  const [state, dispatch] = useReducer(popupReducer, initialPopupState);
  const lastEmailRef = useRef('');
  const profileUrlRef = useRef('');

  const bootstrap = useCallback(async () => {
    const res = await sendMessage({ type: 'GET_STATE' });
    if (!res.ok) {
      dispatch({ type: 'bootstrapFailed', error: res.error });
      return;
    }

    const key = res.apiKey ?? null;
    const detected = await sendMessage({ type: 'GET_DETECTED_EMAIL' });
    const prefill =
      (detected.ok && (detected.detectedEmail ?? detected.pendingEmail)) || res.detectedEmail;

    dispatch({
      type: 'bootstrapReady',
      apiKey: key,
      email: prefill || undefined,
    });
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  async function saveApiKey() {
    dispatch({ type: 'saveApiKeyStarted' });
    const res = await sendMessage({ type: 'SAVE_API_KEY', apiKey: state.setupKey.trim() });
    if (!res.ok) {
      dispatch({ type: 'saveApiKeyFailed', error: res.error });
      return;
    }
    dispatch({ type: 'saveApiKeySucceeded', apiKey: state.setupKey.trim() });
  }

  async function disconnect() {
    await sendMessage({ type: 'CLEAR_API_KEY' });
    dispatch({ type: 'disconnected' });
  }

  async function runLookup() {
    const trimmed = state.email.trim();
    if (!trimmed) return;

    dispatch({ type: 'lookupStarted' });
    profileUrlRef.current = '';

    const res = await sendMessage({
      type: 'LOOKUP',
      email: trimmed,
      name: state.name.trim() || undefined,
      address: state.address.trim() || undefined,
    });

    if (!res.ok) {
      dispatch({
        type: 'lookupFailed',
        error: errorMessage(res.code, res.error),
      });
      return;
    }
    if (!res.lookup) {
      dispatch({
        type: 'lookupFailed',
        error: 'No lookup result returned.',
      });
      return;
    }

    lastEmailRef.current = trimmed;
    profileUrlRef.current = res.profileUrl ?? '';
    dispatch({
      type: 'lookupSucceeded',
      lookup: res.lookup,
      evidenceOrderId: state.orderId.trim() || undefined,
    });
  }

  async function runEvidence() {
    const oid = state.evidenceOrderId.trim() || state.orderId.trim();
    if (!oid || !lastEmailRef.current) {
      dispatch({
        type: 'patch',
        patch: { evidenceError: 'Order ID is required to generate evidence.' },
      });
      return;
    }

    dispatch({ type: 'evidenceStarted' });
    const res = await sendMessage({
      type: 'CREATE_EVIDENCE',
      email: lastEmailRef.current,
      orderId: oid,
    });

    if (!res.ok) {
      dispatch({
        type: 'evidenceFailed',
        error: errorMessage(res.code, res.error),
      });
      return;
    }
    if (!res.evidence) {
      dispatch({
        type: 'evidenceFailed',
        error: 'No evidence result returned.',
      });
      return;
    }

    dispatch({ type: 'evidenceSucceeded', evidence: res.evidence });
  }

  function openProfile() {
    const fallback = `${APP_ORIGIN}/customers`;
    chrome.tabs.create({ url: profileUrlRef.current || fallback });
  }

  function goToSettings() {
    dispatch({ type: 'patch', patch: { screen: 'settings' } });
  }

  function goToLookup() {
    dispatch({ type: 'patch', patch: { screen: 'lookup' } });
  }

  function showEvidenceForm() {
    dispatch({
      type: 'patch',
      patch: {
        showEvidenceForm: true,
        evidenceOrderId: state.orderId.trim() || state.evidenceOrderId,
      },
    });
  }

  if (state.screen === 'loading' && !state.checking && state.apiKey === null) {
    return <PopupBootstrapLoading />;
  }

  if (state.screen === 'settings' && state.apiKey) {
    return (
      <PopupSettingsScreen
        apiKey={state.apiKey}
        onUpdateKey={() => dispatch({ type: 'goToSetupForKeyUpdate' })}
        onDisconnect={() => void disconnect()}
        onBack={goToLookup}
      />
    );
  }

  if (state.screen === 'setup') {
    return (
      <PopupSetupScreen
        setupKey={state.setupKey}
        errorText={state.errorText}
        saving={state.saving}
        onSetupKeyChange={(value) => dispatch({ type: 'patch', patch: { setupKey: value } })}
        onSave={() => void saveApiKey()}
      />
    );
  }

  if (state.screen === 'loading') {
    return <PopupLookupLoadingScreen connected={!!state.apiKey} />;
  }

  if (state.screen === 'error') {
    return (
      <PopupErrorScreen
        connected={!!state.apiKey}
        errorText={state.errorText}
        onSettings={goToSettings}
        onRetry={goToLookup}
      />
    );
  }

  if (state.screen === 'results' && state.lookup) {
    return (
      <PopupResultsScreen
        lookup={state.lookup}
        showEvidenceForm={state.showEvidenceForm}
        evidenceOrderId={state.evidenceOrderId}
        evidenceLoading={state.evidenceLoading}
        evidence={state.evidence}
        evidenceError={state.evidenceError}
        onSettings={goToSettings}
        onOpenProfile={openProfile}
        onShowEvidenceForm={showEvidenceForm}
        onEvidenceOrderIdChange={(value) =>
          dispatch({ type: 'patch', patch: { evidenceOrderId: value } })
        }
        onGenerateEvidence={() => void runEvidence()}
        onCancelEvidenceForm={() =>
          dispatch({ type: 'patch', patch: { showEvidenceForm: false } })
        }
        onNewLookup={() => dispatch({ type: 'resetLookup' })}
      />
    );
  }

  return (
    <PopupLookupScreen
      email={state.email}
      name={state.name}
      orderId={state.orderId}
      address={state.address}
      showOptional={state.showOptional}
      checking={state.checking}
      onSettings={goToSettings}
      onEmailChange={(value) => dispatch({ type: 'patch', patch: { email: value } })}
      onNameChange={(value) => dispatch({ type: 'patch', patch: { name: value } })}
      onOrderIdChange={(value) => dispatch({ type: 'patch', patch: { orderId: value } })}
      onAddressChange={(value) => dispatch({ type: 'patch', patch: { address: value } })}
      onToggleOptional={() =>
        dispatch({ type: 'patch', patch: { showOptional: !state.showOptional } })
      }
      onLookup={() => void runLookup()}
    />
  );
}
