'use client';

import { useEffect, useReducer, useState, type CSSProperties, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  accountSettingsReducer,
  initialAccountSettingsState,
  type MerchantData,
} from '@/components/settings/accountSettingsReducer';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { ORDER_VOLUME_OPTIONS, LOSS_CONCERN_OPTIONS, orderVolumeCorrection, LEGACY_LOSS_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';

export type AccountSetupPayload = {
  user?: { email?: string; role?: string | null };
  merchant?: MerchantData | null;
};

const controlStyle: CSSProperties = {
  minWidth: 260,
  height: 30,
  border: 0,
  borderRadius: 8,
  padding: '0 10px',
  outline: 'none',
  boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)',
  background: '#fff',
  color: '#1c1f23',
  font: "400 12px/1.2 'Inter',sans-serif",
};

function QuietButton({
  children,
  onClick,
  disabled,
  type = 'button',
  tone = 'quiet',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  tone?: 'quiet' | 'primary' | 'danger';
}) {
  return <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={{
      flex: 'none',
      border: 0,
      borderRadius: 9,
      padding: '6px 11px',
      background: tone === 'primary' ? '#1c1f23' : '#fff',
      boxShadow: tone === 'quiet' ? 'inset 0 0 0 1px rgba(28,27,25,.11)' : tone === 'danger' ? 'inset 0 0 0 1px rgba(176,67,26,.35)' : 'none',
      color: tone === 'primary' ? '#fff' : tone === 'danger' ? '#b0431a' : '#40454a',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .45 : 1,
      font: "500 12.5px/1 'Inter',sans-serif",
    }}
  >{children}</button>;
}

function Card({ title, children, grow = false }: { title: string; children: ReactNode; grow?: boolean }) {
  return <section style={{ flex: grow ? 1 : 'none', minHeight: 0, borderRadius: 10, padding: '6px 18px 8px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
    <h2 style={{ margin: 0, padding: '11px 0 3px', color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{title}</h2>
    {children}
  </section>;
}

function Row({ label, description, children, last = false }: { label: string; description: string; children: ReactNode; last?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '12px 0', borderBottom: last ? 0 : '1px solid #f4f2ef' }}>
    <div style={{ width: 250, flex: 'none' }}>
      <div style={{ color: '#1c1f23', font: "500 12.5px/1.35 'Inter',sans-serif" }}>{label}</div>
      <div style={{ marginTop: 3, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{description}</div>
    </div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>{children}</div>
  </div>;
}

export default function AccountSettingsPage({ initialData, canManageWorkspace }: { initialData: AccountSetupPayload; canManageWorkspace: boolean }) {
  const supabase = createClient();
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [mfaRetry, setMfaRetry] = useState(0);
  const [mfaState, setMfaState] = useState<'loading' | 'on' | 'off' | 'pending' | 'unavailable'>('loading');
  const [state, dispatch] = useReducer(
    accountSettingsReducer,
    initialData,
    (data) => accountSettingsReducer(initialAccountSettingsState, { type: 'loadAccount', userEmail: data.user?.email ?? '', merchant: data.merchant ?? null }),
  );
  const remoteSetup = useFetchJson<AccountSetupPayload>('/api/account/setup', { enabled: remoteEnabled });
  const setupData = remoteSetup.data ?? initialData;
  const setupError = remoteSetup.error;

  useEffect(() => {
    if (!setupData) return;
    dispatch({ type: 'loadAccount', userEmail: setupData.user?.email ?? '', merchant: setupData.merchant ?? null });
  }, [setupData]);

  useEffect(() => {
    let active = true;
    setMfaState('loading');
    void supabase.auth.mfa.listFactors().then(({ data, error }: { data?: { all?: Array<{ status?: string }> } | null; error?: unknown }) => {
      if (!active) return;
      if (error) setMfaState('unavailable');
      else if (!Array.isArray(data?.all)) setMfaState('unavailable');
      else setMfaState(data.all.some(factor => factor.status === 'verified') ? 'on' : data.all.length ? 'pending' : 'off');
    }).catch(() => { if (active) setMfaState('unavailable'); });
    return () => { active = false; };
  }, [supabase.auth.mfa, mfaRetry]);

  const dirty = Boolean(state.merchant) && (
    state.storeName.trim() !== state.merchant?.name
    || state.monthlyVolume !== (state.merchant?.monthly_order_volume ?? '')
    || state.fraudConcern !== (state.merchant?.primary_fraud_concern ?? '')
  );

  async function saveProfile() {
    dispatch({ type: 'patch', patch: { saving: true, saveError: '', saveSuccess: false } });
    try {
      if (!state.merchant) throw new Error('Still loading your workspace profile. Wait a moment and try again.');
      if (orderVolumeCorrection(state.monthlyVolume)) throw new Error(orderVolumeCorrection(state.monthlyVolume)!);
      const response = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: state.storeName.trim(),
          monthlyOrderVolume: state.monthlyVolume || null,
          primaryLossConcern: state.fraudConcern || null,
          setupComplete: state.merchant.setup_complete,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not save merchant profile.');
      dispatch({ type: 'profileSaved', merchant: { ...state.merchant, name: state.storeName.trim(), monthly_order_volume: state.monthlyVolume || null, primary_fraud_concern: state.fraudConcern || null } });
      window.setTimeout(() => dispatch({ type: 'patch', patch: { saveSuccess: false } }), 4000);
    } catch (error) {
      dispatch({ type: 'patch', patch: { saveError: error instanceof Error ? error.message : 'Could not save merchant profile.', saving: false } });
    }
  }

  function discardProfile() {
    if (!state.merchant) return;
    dispatch({ type: 'loadAccount', userEmail: state.userEmail, merchant: state.merchant });
  }

  async function changePassword() {
    dispatch({ type: 'patch', patch: { passwordError: '', passwordSuccess: '' } });
    if (state.newPassword.length < 8) {
      dispatch({ type: 'patch', patch: { passwordError: 'New password must be at least 8 characters.' } });
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      dispatch({ type: 'patch', patch: { passwordError: 'Passwords do not match.' } });
      return;
    }
    dispatch({ type: 'patch', patch: { passwordSaving: true } });
    try {
      const { error } = await supabase.auth.updateUser({ password: state.newPassword });
      if (error) throw error;
      dispatch({ type: 'patch', patch: { passwordSuccess: 'Password updated successfully.', newPassword: '', confirmPassword: '', passwordSaving: false } });
      setChangingPassword(false);
    } catch (error) {
      dispatch({ type: 'patch', patch: { passwordError: error instanceof Error ? error.message : 'Password update failed.', passwordSaving: false } });
    }
  }

  const roleLabel = initialData.user?.role
    ? `${initialData.user.role.slice(0, 1).toUpperCase()}${initialData.user.role.slice(1)} account`
    : canManageWorkspace ? 'Workspace administrator' : 'Workspace member';
  const mfaLabel = mfaState === 'on' ? 'Verified factor enrolled' : mfaState === 'pending' ? 'Enrolment not verified' : mfaState === 'off' ? 'No enrolled factor' : mfaState === 'loading' ? 'Checking…' : 'Status unavailable';
  const mfaTone = mfaState === 'on' ? { background: '#eef6f1', color: '#1a6b43' } : mfaState === 'off' ? { background: '#fff3e9', color: '#7a5310' } : { background: '#f4f2ef', color: '#64686d' };

  const toolbar = <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
    <span style={{ color: '#64686d', font: "400 12.5px/1.5 'Inter',sans-serif" }}>Your identity, account security, and the workspace&apos;s own description of itself.</span>
    <span style={{ flex: 1 }}/>
    {state.saveError ? <span role="alert" style={{ maxWidth: 260, color: '#b0431a', font: "400 10.5px/1.35 'Inter',sans-serif" }}>{state.saveError}</span> : state.saveSuccess ? <span role="status" style={{ color: '#1a6b43', font: "400 10.5px/1.35 'Inter',sans-serif" }}>Saved</span> : null}
    <QuietButton onClick={discardProfile} disabled={!dirty || state.saving}>Discard</QuietButton>
    <QuietButton tone="primary" onClick={() => void saveProfile()} disabled={!canManageWorkspace || !dirty || state.saving}>{state.saving ? 'Saving…' : 'Save changes'}</QuietButton>
  </div>;

  if (remoteSetup.loading && !setupData) {
    return <SettingsPageShell title="Account settings" surfaceId="account-and-appearance" truth={{ access: '', currentState: '', saveBehavior: '', impact: '' }} toolbar={toolbar}>
      <div role="status" aria-label="Loading account settings" style={{ minHeight: 280, borderRadius: 10, background: '#f4f3f1', animation: 'om-shimmer 1.7s ease-in-out infinite' }}/>
    </SettingsPageShell>;
  }

  if (setupError && !setupData) {
    return <SettingsPageShell title="Account settings" surfaceId="account-and-appearance" truth={{ access: '', currentState: '', saveBehavior: '', impact: '' }} toolbar={toolbar}>
      <div role="alert" style={{ padding: 24, borderRadius: 10, background: '#fdf0e6', color: '#b0431a' }}>
        <strong>Account settings unavailable</strong>
        <p>{setupError} No profile values are shown because a verified workspace profile was not loaded.</p>
        <QuietButton onClick={() => setRemoteEnabled(true)}>Try again</QuietButton>
      </div>
    </SettingsPageShell>;
  }

  return <SettingsPageShell
    title="Account settings"
    surfaceId="account-and-appearance"
    toolbar={toolbar}
    workspaceName={state.merchant?.name}
    truth={{ access: canManageWorkspace ? 'Workspace profile: owner or administrator · password: you' : 'Workspace profile: read-only · password: you', currentState: state.merchant ? `Workspace ${state.merchant.name}` : 'Workspace profile is still being verified', saveBehavior: 'Profile and password save separately', impact: 'Profile affects future workspace context; password changes affect this account' }}
  >
    {setupError ? <div role="alert" style={{ borderRadius: 9, padding: '9px 12px', background: '#fdf0e6', color: '#b0431a', font: "400 11px/1.45 'Inter',sans-serif" }}>Account details may be stale. {setupError} <button type="button" onClick={() => remoteEnabled ? remoteSetup.reload() : setRemoteEnabled(true)} style={{ border: 0, padding: 0, background: 'transparent', color: '#9f4f08', textDecoration: 'underline', cursor: 'pointer' }}>Try again</button></div> : null}
    <Card title="YOU">
      <Row label="Email" description="Used to sign in. Changing it needs the new address confirmed.">
        <span style={{ ...controlStyle, display: 'inline-flex', alignItems: 'center' }}>{state.userEmail || 'Unavailable'}</span>
        <span style={{ color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{roleLabel}</span>
      </Row>
      <Row label="Password" description={state.passwordSuccess || 'Saved separately from workspace settings.'}>
        {changingPassword ? <>
          <input aria-label="New password" type={state.showPasswords ? 'text' : 'password'} value={state.newPassword} onChange={(event) => dispatch({ type: 'patch', patch: { newPassword: event.target.value } })} placeholder="New password" style={{ ...controlStyle, minWidth: 170 }}/>
          <input aria-label="Confirm new password" type={state.showPasswords ? 'text' : 'password'} value={state.confirmPassword} onChange={(event) => dispatch({ type: 'patch', patch: { confirmPassword: event.target.value } })} placeholder="Confirm" style={{ ...controlStyle, minWidth: 150 }}/>
          <QuietButton onClick={() => dispatch({ type: 'patch', patch: { showPasswords: !state.showPasswords } })}>{state.showPasswords ? 'Hide' : 'Show'}</QuietButton>
          <QuietButton tone="primary" onClick={() => void changePassword()} disabled={state.passwordSaving}>{state.passwordSaving ? 'Updating…' : 'Update'}</QuietButton>
          <QuietButton disabled={state.passwordSaving} onClick={() => setChangingPassword(false)}>Cancel</QuietButton>
        </> : <>
          <span style={{ ...controlStyle, display: 'inline-flex', alignItems: 'center', color: '#64686d', fontFamily: "'IBM Plex Mono',monospace" }}>••••••••••••</span>
          <QuietButton onClick={() => setChangingPassword(true)}>Change password</QuietButton>
        </>}
        {state.passwordError ? <span role="alert" style={{ color: '#b0431a', font: "400 10.5px/1.35 'Inter',sans-serif" }}>{state.passwordError}</span> : null}
      </Row>
      <Row last label="Two-factor authentication" description="Workspace two-factor requirements and enforcement are not implemented. Enrolment and recovery controls are unavailable here.">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px', borderRadius: 7, ...mfaTone, font: "500 11.5px/1.4 'Inter',sans-serif" }}>{mfaLabel}</span>
        {mfaState === 'unavailable' ? <QuietButton onClick={() => setMfaRetry(value => value + 1)}>Check again</QuietButton> : null}
      </Row>
    </Card>

    <Card title="THIS WORKSPACE">
      <Row label="Business name" description="Workspace name used in Unauth and supported exports.">
        <input aria-label="Business name" value={state.storeName} disabled={!canManageWorkspace} onChange={(event) => dispatch({ type: 'patch', patch: { storeName: event.target.value } })} style={controlStyle}/>
      </Row>
      <Row label="Monthly order volume" description="Your stated monthly range. This profile value does not change import limits.">
        <select aria-label="Monthly order volume" value={state.monthlyVolume} disabled={!canManageWorkspace} onChange={(event) => dispatch({ type: 'patch', patch: { monthlyVolume: event.target.value } })} style={{ ...controlStyle, minWidth: 0, width: 'auto' }}>
          <option value="">Not specified</option>
          {orderVolumeCorrection(state.monthlyVolume) ? <option value={state.monthlyVolume} disabled>Saved value needs correction</option> : null}
          {ORDER_VOLUME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Row>
      {orderVolumeCorrection(state.monthlyVolume) ? <p role="status" style={{ color: "#7a5310", fontSize: 12 }}>{orderVolumeCorrection(state.monthlyVolume)}</p> : null}
      <Row last label="Primary loss concern" description="Records your stated concern. It does not change Work queue ordering.">
        <select aria-label="Primary loss concern" value={state.fraudConcern} disabled={!canManageWorkspace} onChange={(event) => dispatch({ type: 'patch', patch: { fraudConcern: event.target.value } })} style={{ ...controlStyle, minWidth: 0, width: 'auto' }}>
          <option value="">Select…</option>
          {LEGACY_LOSS_CONCERN_OPTIONS.filter((option) => option.value === state.fraudConcern && !LOSS_CONCERN_OPTIONS.some((current) => current.value === option.value)).map((option) => <option key={option.value} value={option.value}>{option.label} · previously saved</option>)}
          {LOSS_CONCERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span style={{ color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Changes affect future workspace context</span>
      </Row>
    </Card>

    <Card title="DISPLAY SUPPORT" grow>
      <Row last label="Appearance" description="Unauth currently supports one verified visual appearance.">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: '#f4f3f1', color: '#40454a', font: "500 12px/1.35 'Inter',sans-serif" }}>
          <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: '50%', background: '#fff', boxShadow: 'inset 0 0 0 1px #d7d2cb' }}/>
          Light appearance · supported
        </span>
        <span style={{ color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Dark and system-matched appearances are not available.</span>
      </Row>
      <div style={{ borderTop: '1px solid #e4e3e0', marginTop: 10, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#b0431a', font: "500 12.5px/1.35 'Inter',sans-serif" }}>Workspace data and deletion</div>
          <div style={{ marginTop: 3, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>Subject privacy review and owner-only workspace deletion are separate tasks in <a href="/settings/legal/data-privacy" style={{ color: '#9b470d' }}>data privacy</a>.</div>
        </div>
        <a href="/settings/legal/data-privacy" style={{ flex: 'none', borderRadius: 9, padding: '6px 11px', boxShadow: 'inset 0 0 0 1px rgba(176,67,26,.35)', color: '#b0431a', textDecoration: 'none', font: "500 12.5px/1 'Inter',sans-serif" }}>Review data privacy</a>
      </div>
    </Card>
  </SettingsPageShell>;
}
