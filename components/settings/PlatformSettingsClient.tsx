'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/AppNavLink';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/settings/platform';
import { normalizeReportTimezone } from '@/lib/reporting/intelligence';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type PeriodState = 'closed' | 'open' | 'unavailable';

function Action({ children, primary = false, disabled, onClick }: { children: ReactNode; primary?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} style={{ border: 0, borderRadius: 9, padding: '6px 11px', background: primary ? '#1c1f23' : '#fff', boxShadow: primary ? 'none' : 'inset 0 0 0 1px rgba(28,27,25,.11)', color: primary ? '#fff' : '#40454a', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, font: "500 12.5px/1 'Inter',sans-serif" }}>{children}</button>;
}

function monthKeys() {
  const current = new Date();
  current.setUTCDate(1);
  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 12 + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
      year: String(date.getUTCFullYear()).slice(2),
      current: index === 12,
      previous: index === 11,
    };
  });
}

export function PlatformSettingsClient({ canManage }: { canManage: boolean }) {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [periods, setPeriods] = useState<Record<string, PeriodState>>({});
  const months = useMemo(monthKeys, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setState('idle');
    setMessage(null);
    void fetch('/api/settings/platform', { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({})) as { settings?: PlatformSettings; error?: string };
        if (!response.ok || !body.settings) throw new Error(body.error ?? 'Unable to load platform settings.');
        if (!active) return;
        setSettings(body.settings);
        setSavedSettings(body.settings);
      })
      .catch((error: unknown) => {
        if (active && (error as Error).name !== 'AbortError') {
          setState('error');
          setMessage((error as Error).message);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [reloadVersion]);

  useEffect(() => {
    let active = true;
    void Promise.all(months.map(async ({ key }) => {
      try {
        const response = await fetch(`/api/financial-periods/${key}/close`);
        const body = await response.json().catch(() => ({})) as { signOff?: unknown; signOffState?: string };
        return [key, response.ok && body.signOffState === 'available' ? body.signOff ? 'closed' : 'open' : 'unavailable'] as const;
      } catch {
        return [key, 'unavailable'] as const;
      }
    })).then((rows) => { if (active) setPeriods(Object.fromEntries(rows)); });
    return () => { active = false; };
  }, [months]);

  const dirty = savedSettings != null && JSON.stringify(settings) !== JSON.stringify(savedSettings);
  function patch<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setState('idle');
    setMessage(null);
  }

  function discard() {
    if (savedSettings) setSettings(savedSettings);
    setState('idle');
    setMessage(null);
  }

  async function save() {
    if (!/^[A-Z]{3}$/.test(settings.reportingCurrency.trim())) {
      setState('error');
      setMessage('Reporting currency must be a three-letter ISO code.');
      return;
    }
    if (normalizeReportTimezone(settings.timezone.trim()) !== settings.timezone.trim()) {
      setState('error');
      setMessage('Timezone must be a valid IANA timezone, such as Europe/London.');
      return;
    }
    setState('saving');
    setMessage(null);
    try {
      const response = await fetch('/api/settings/platform', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const body = await response.json().catch(() => ({})) as { settings?: PlatformSettings; error?: string };
      if (!response.ok || !body.settings) throw new Error(response.status === 409 ? 'These defaults changed in another session. Refresh before saving again.' : body.error ?? 'Unable to save platform settings.');
      setSettings(body.settings);
      setSavedSettings(body.settings);
      setState('saved');
      setMessage('Money and period settings saved.');
      router.refresh();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save platform settings.');
    }
  }

  const toolbar = <div style={{ "height": "54px", "flex": "none", "display": "flex", "alignItems": "center", "gap": "14px", "padding": "0 22px", "borderBottom": "1px solid #eae8e5" }}>{"\n      "}<span style={{ "font": "400 12.5px/1.5 'Inter',sans-serif", "color": "#64686d", "maxWidth": "680px" }}>{"Manage reporting preferences and review recorded period closes. Currency conversion and automatic month locking are not configured here."}</span>{"\n      "}<div style={{ "flex": "1" }}></div>{"\n      "}<button type="button" onClick={discard} disabled={!dirty || state === "saving"} style={{ "border": 0, "cursor": "pointer", "padding": "6px 10px", "borderRadius": "9px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.11)", "font": "400 12.5px/1 'Inter',sans-serif", "color": "#40454a" }}>{"Discard"}</button><button type="button" onClick={() => void save()} disabled={!canManage || !dirty || state === "saving"} style={{ "border": 0, "cursor": "pointer", "padding": "6px 11px", "borderRadius": "9px", "background": "#1c1f23", "color": "#ffffff", "font": "500 12.5px/1 'Inter',sans-serif" }}>{state === "saving" ? "Saving…" : "Save changes"}</button>{"\n    "}</div>;

  if (loading) {
    return <SettingsPageShell title="Money and period" surfaceId="platform-defaults" toolbar={toolbar} truth={{ access: '', currentState: '', saveBehavior: '', impact: '' }}>
      <div role="status" aria-label="Loading money and period settings" style={{ height: 420, borderRadius: 10, background: '#f4f2ef', animation: 'om-shimmer 1.7s ease-in-out infinite' }}/>
    </SettingsPageShell>;
  }

  if (state === 'error' && !savedSettings) {
    return <SettingsPageShell title="Money and period" surfaceId="platform-defaults" toolbar={toolbar} truth={{ access: '', currentState: '', saveBehavior: '', impact: '' }}>
      <div role="alert" style={{ padding: 24, borderRadius: 10, background: '#fdf0e6', color: '#b0431a' }}>
        <strong>Workspace defaults could not be loaded</strong>
        <p>{message ?? 'No saved defaults are shown because the workspace settings source did not return a verified state.'}</p>
        <Action onClick={() => setReloadVersion((value) => value + 1)}>Try again</Action>
      </div>
    </SettingsPageShell>;
  }

  return <SettingsPageShell
    title="Money and period"
    surfaceId="platform-defaults"
    toolbar={toolbar}
    truth={{ access: canManage ? 'Owner or administrator with Manage settings' : 'Read-only for your current role', currentState: 'Loaded workspace defaults are the effective values for future work', saveBehavior: 'One explicit save applies money and period settings', impact: 'Reporting preferences only; never historical decisions, source amounts, captured deadlines or automatic period closes' }}
  >
    {!canManage ? <div role="note" style={{ borderRadius: 9, padding: '9px 12px', background: '#f4f3f1', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>Read-only access. An owner or administrator with Manage settings permission can change these values.</div> : null}
    {message ? <span role={state === 'error' ? 'alert' : 'status'} style={{color: state === 'error' ? '#b0431a' : '#1a6b43', font: "400 10.5px/1.35 'Inter',sans-serif"}}>{message}</span> : null}
    <div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "6px 18px 8px", "flex": "none" }}>{"\n          "}<div style={{ "padding": "11px 0 3px", "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"MONEY"}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0", "borderBottom": "1px solid #f4f2ef" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Reporting currency"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"The preferred reporting currency. Source amounts stay in their recorded currencies; this setting does not convert or restate history."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "flex-start", "gap": "14px" }}>{"\n                "}<span style={{ "position": "relative", "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23", "flex": "none" }}>{settings.reportingCurrency}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg><select aria-label="Reporting currency" value={settings.reportingCurrency} disabled={!canManage || state === 'saving'} onChange={(event) => patch('reportingCurrency', event.target.value)} onFocus={(event) => { event.currentTarget.parentElement!.style.outline = '2px solid #1c1f23'; }} onBlur={(event) => { event.currentTarget.parentElement!.style.outline = ''; }} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}>{[...new Set([settings.reportingCurrency, 'GBP', 'EUR', 'USD'])].map((code) => <option key={code} value={code}>{code}</option>)}</select></span>{"\n                "}<div style={{ "flex": "1", "minWidth": "0", "background": "#f4f3f1", "borderRadius": "9px", "padding": "10px 12px" }}>{"\n                  "}<div style={{ "font": "400 9.5px/1 'IBM Plex Mono',monospace", "letterSpacing": ".05em", "color": "#64686d" }}>{"CURRENCY CONVERSION PREVIEW UNAVAILABLE"}</div>{"\n                  "}<div style={{ "display": "flex", "gap": "16px", "marginTop": "8px" }}>{"\n                    \n                    "}<div style={{ "flex": "1", "minWidth": "0" }}><div style={{ "font": "400 9.5px/1.4 'IBM Plex Mono',monospace", "color": "#64686d", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{"GROSS EXPOSURE"}</div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "6px", "marginTop": "5px" }}><span style={{ "font": "400 11px/1 'IBM Plex Mono',monospace", "color": "#a7abad", "textDecoration": "line-through" }}>{"—"}</span><span style={{ "font": "400 12px/1 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{"—"}</span></div></div>{"\n                    "}<div style={{ "flex": "1", "minWidth": "0" }}><div style={{ "font": "400 9.5px/1.4 'IBM Plex Mono',monospace", "color": "#64686d", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{"RECOVERED"}</div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "6px", "marginTop": "5px" }}><span style={{ "font": "400 11px/1 'IBM Plex Mono',monospace", "color": "#a7abad", "textDecoration": "line-through" }}>{"—"}</span><span style={{ "font": "400 12px/1 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{"—"}</span></div></div>{"\n                    "}<div style={{ "flex": "1", "minWidth": "0" }}><div style={{ "font": "400 9.5px/1.4 'IBM Plex Mono',monospace", "color": "#64686d", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{"ABSORBED"}</div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "6px", "marginTop": "5px" }}><span style={{ "font": "400 11px/1 'IBM Plex Mono',monospace", "color": "#a7abad", "textDecoration": "line-through" }}>{"—"}</span><span style={{ "font": "400 12px/1 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{"—"}</span></div></div>{"\n                  "}</div>{"\n                  "}<div style={{ "font": "400 10.5px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "9px" }}>{"An approved dated exchange-rate source is not configured here. Converted figures are withheld; changing the preference does not restate recorded amounts."}</div>{"\n                "}</div>{"\n              "}</div>{"\n            "}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0", "borderBottom": "1px solid #f4f2ef" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Rounding"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"Amounts retain the decimal precision of their recorded currency."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "position": "relative", "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23" }}>{"Recorded currency precision"}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg><select aria-label="Rounding" value={"Recorded currency precision"} disabled={true}  onFocus={(event) => { event.currentTarget.parentElement!.style.outline = '2px solid #1c1f23'; }} onBlur={(event) => { event.currentTarget.parentElement!.style.outline = ''; }} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}><option>Recorded currency precision</option></select></span></div>{"\n            "}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Timezone"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"Workspace reporting preference. Existing source timestamps and captured deadline terms are preserved."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23" }}><input aria-label="Timezone" value={settings.timezone} disabled={!canManage || state === 'saving'} onChange={(event) => patch('timezone', event.target.value)} style={{border:0,padding:0,background:'transparent',color:'inherit',font:'inherit',width:`${Math.max(12,settings.timezone.length)}ch`}} /><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg></span><span style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"IANA timezone"}</span></div>{"\n            "}</div>{"\n        "}</div>
    <div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "6px 18px 14px", "flex": "1", "minHeight": "0", "display": "flex", "flexDirection": "column" }}>{"\n          "}<div style={{ "padding": "11px 0 3px", "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"FISCAL PERIOD"}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0", "borderBottom": "1px solid #f4f2ef" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Fiscal calendar"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"Determines what a month means in every report and export."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "position": "relative", "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23" }}>{"Calendar months"}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg><select aria-label="Fiscal calendar" value={"Calendar months"} disabled={true}  onFocus={(event) => { event.currentTarget.parentElement!.style.outline = '2px solid #1c1f23'; }} onBlur={(event) => { event.currentTarget.parentElement!.style.outline = ''; }} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}><option>Calendar months</option></select></span><span style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Alternative calendars are unavailable in the current product contract"}</span></div>{"\n            "}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0", "borderBottom": "1px solid #f4f2ef" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"A month locks"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"Period sign-off requires an explicit authorised action. No automatic locking schedule is configured."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "position": "relative", "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23" }}>{"Manual sign-off"}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg><select aria-label="Month locking policy" value={"Manual sign-off"} disabled={true}  onFocus={(event) => { event.currentTarget.parentElement!.style.outline = '2px solid #1c1f23'; }} onBlur={(event) => { event.currentTarget.parentElement!.style.outline = ''; }} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}><option>Manual sign-off</option></select></span></div>{"\n            "}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0", "borderBottom": "1px solid #f4f2ef" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Who may close a period"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"Period close is permission-gated and recorded in the append-only audit log."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "position": "relative", "display": "inline-flex", "alignItems": "center", "gap": "7px", "padding": "6px 9px", "borderRadius": "8px", "boxShadow": "inset 0 0 0 1px rgba(28,27,25,.1)", "font": "400 12px/1 'Inter',sans-serif", "color": "#1c1f23" }}>{"Manage settings permission"}<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><path d="M2.6 4 5 6.4 7.4 4"></path></svg><select aria-label="Who may close a period" value={"Manage settings permission"} disabled={true}  onFocus={(event) => { event.currentTarget.parentElement!.style.outline = '2px solid #1c1f23'; }} onBlur={(event) => { event.currentTarget.parentElement!.style.outline = ''; }} style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0,cursor:'pointer'}}><option>Manage settings permission</option></select></span><span style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{canManage ? 'Permitted for your role' : 'Not permitted for your role'}</span></div>{"\n            "}</div>{"\n          \n            "}<div style={{ "display": "flex", "alignItems": "flex-start", "gap": "16px", "padding": "12px 0" }}>{"\n              "}<div style={{ "width": "250px", "flex": "none" }}>{"\n                "}<div style={{ "font": "500 12.5px/1.35 'Inter',sans-serif", "color": "#1c1f23" }}>{"Warn before a close leaves money open"}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "3px" }}>{"The reconciliation preview reports current blockers before sign-off."}</div>{"\n              "}</div>{"\n              "}<div style={{ "flex": "1", "minWidth": "0", "display": "flex", "alignItems": "center", "gap": "10px" }}><span style={{ "width": "30px", "height": "18px", "flex": "none", "borderRadius": "9px", "background": "#1c1f23", "position": "relative", "display": "block" }}><span style={{ "position": "absolute", "top": "2px", "left": "14px", "width": "14px", "height": "14px", "borderRadius": "50%", "background": "#ffffff", "boxShadow": "0 1px 2px rgba(28,27,25,.25)" }}></span></span><Link href="/financials/reconciliation" style={{ "font": "400 11.5px/1.5 'Inter',sans-serif" }}>{"Review the current close"}</Link></div>{"\n            "}</div>{"\n          "}<div style={{ "background": "#f4f3f1", "borderRadius": "11px", "padding": "13px 14px 11px", "marginTop": "6px" }}>{"\n            "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "10px", "marginBottom": "11px" }}>{"\n              "}<span style={{ "font": "600 10px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"TWELVE MONTHS OF THIS WORKSPACE"}</span>{"\n              "}<div style={{ "flex": "1" }}></div>{"\n              "}<span style={{ "font": "400 10px/1 'IBM Plex Mono',monospace", "color": "#64686d" }}>{`${Object.values(periods).filter((value) => value === 'closed').length} closed · ${Object.values(periods).filter((value) => value === 'open').length} open · ${months.length - Object.values(periods).filter((value) => value !== 'unavailable').length} unavailable`}</span>{"\n            "}</div>{"\n            "}<div style={{ "display": "flex", "gap": "6px", "alignItems": "flex-end" }}>{"\n              "}{months.map((month) => (<div key={month.key} title={`${month.key}: ${periods[month.key] ?? "unavailable"}`} style={{ "flex": "1", "display": "flex", "flexDirection": "column", "gap": "6px", "alignItems": "center" }}>{"\n                "}<div style={{ "width": "100%", "height": "26px", "borderRadius": "5px", "background": periods[month.key] === "closed" ? "#1c1f23" : "#efece8", "color": "#64686d", "display": "flex", "alignItems": "center", "justifyContent": "center" }}>{"\n                  "}{periods[month.key] === 'closed' ? <svg role="img" aria-label="Closed" width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#ffffff" strokeWidth="1.2"><rect x="2" y="4.4" width="6" height="4.2" rx="1"></rect><path d="M3.4 4.4V3.2a1.6 1.6 0 0 1 3.2 0v1.2"></path></svg> : periods[month.key] === 'open' ? null : '—'}{"\n                  \n                "}</div>{"\n                "}<span style={{ "font": "400 9.5px/1 'IBM Plex Mono',monospace", "color": "#64686d" }}>{`${month.label} ${month.year}`}</span>{"\n              "}</div>))}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}{"\n              "}</div>{"\n          "}</div>{"\n          "}<div style={{ "flex": "1" }}></div>{"\n          "}<div style={{ "borderTop": "1px solid #e4e3e0", "marginTop": "12px", "paddingTop": "11px", "display": "flex", "alignItems": "center", "gap": "12px" }}>{"\n            "}<span style={{ "flex": "1", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Period close is separately confirmed and recorded in the audit log. Editing these defaults does not close a period."}</span>{"\n            "}<Link href="/settings/governance/audit-trail" style={{ "font": "500 11.5px/1.5 'Inter',sans-serif" }}>{"See what changed recently"}</Link>{"\n          "}</div>{"\n        "}</div>
  </SettingsPageShell>;
}
