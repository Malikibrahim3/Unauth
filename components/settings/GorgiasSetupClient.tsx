'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';

const LS_KEY = 'unauth_gorgias_widget_token';
const LS_PREFIX_KEY = 'unauth_gorgias_widget_token_prefix';

type Props = {
  appBaseUrl: string;
  hasApiKeys: boolean;
  keyPrefixes: string[];
  widgetTokenPrefixes: string[];
};

const GORGIAS_VARS = {
  email: '{{ticket.customer.email}}',
  name: '{{ticket.customer.name}}',
  orderId: '{{ticket.meta.shopify_order_id}}',
};

export default function GorgiasSetupClient({ appBaseUrl, hasApiKeys, keyPrefixes, widgetTokenPrefixes }: Props) {
  // Lazy initializer: restore a previously-generated token from localStorage on
  // first render if its prefix still matches an active token on this account.
  const [widgetTokenInput, setWidgetTokenInput] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      const savedPrefix = localStorage.getItem(LS_PREFIX_KEY);
      if (saved && savedPrefix && widgetTokenPrefixes.includes(savedPrefix)) return saved;
    } catch {
      // localStorage unavailable
    }
    return '';
  });
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function generateToken() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gorgias widget' }),
      });
      const body = await res.json() as { key?: { widget_token?: string; widget_token_prefix?: string }; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to generate token');
      const token = body.key?.widget_token ?? '';
      const prefix = body.key?.widget_token_prefix ?? '';
      if (!token) throw new Error('No token returned');
      setWidgetTokenInput(token);
      try {
        localStorage.setItem(LS_KEY, token);
        localStorage.setItem(LS_PREFIX_KEY, prefix);
      } catch {
        // localStorage unavailable — token is in state for this session
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate token');
    } finally {
      setGenerating(false);
    }
  }

  const widgetUrl = useMemo(() => {
    const base = appBaseUrl.replace(/\/$/, '');
    const key = widgetTokenInput.trim() || 'YOUR_WIDGET_TOKEN';
    const params = new URLSearchParams({
      widget_token: key,
      email: GORGIAS_VARS.email,
      name: GORGIAS_VARS.name,
      order_id: GORGIAS_VARS.orderId,
    });
    return `${base}/api/gorgias/widget?${params.toString()}`;
  }, [appBaseUrl, widgetTokenInput]);

  async function copyUrl() {
    await navigator.clipboard.writeText(widgetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!hasApiKeys) {
    return (
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          You need an API key first
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Create a key in API &amp; Integrations, then return here to copy your Gorgias widget URL.
        </p>
        <Link
          href="/settings/api-integrations"
          className="mt-4 inline-flex rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          Create API key →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
        Gorgias sidebar widget
      </h2>
      <ol className="list-decimal space-y-3 pl-5 text-sm" style={{ color: 'var(--text)' }}>
        <li>Copy your widget URL below — it will be ready once a token is generated or pasted.</li>
        <li>
          In Gorgias → Settings → Apps &amp; Plugins → HTTP Integration → Create
        </li>
        <li>Paste the URL as the widget endpoint</li>
        <li>Set display name to &quot;Unauth Fraud Intelligence&quot;</li>
        <li>Save — Unauth appears on every ticket sidebar</li>
      </ol>

      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <div>
          {widgetTokenInput ? (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Widget token
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Token loaded — your URL below is ready to copy.
              </p>
              <button
                type="button"
                onClick={() => {
                  setWidgetTokenInput('');
                  try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_PREFIX_KEY); } catch { /* ignore */ }
                }}
                className="mt-1 text-xs underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear and paste a different token
              </button>
            </div>
          ) : widgetTokenPrefixes.length === 0 ? (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Widget token
              </p>
              <button
                type="button"
                onClick={() => void generateToken()}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
              >
                {generating ? 'Generating…' : 'Generate token'}
              </button>
              {generateError && (
                <p className="mt-2 text-xs" style={{ color: 'var(--danger, #e8362a)' }}>
                  {generateError}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Paste your widget token
              </label>
              <input
                type="password"
                className="w-full rounded-md px-3 py-2 text-sm font-mono"
                style={{
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
                placeholder="unauth_wt_…"
                value={widgetTokenInput}
                onChange={(e) => setWidgetTokenInput(e.target.value)}
                autoComplete="off"
              />
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Active tokens: {widgetTokenPrefixes.join(', ')}. Paste the full secret to build the URL.
              </p>
            </div>
          )}
          {keyPrefixes.length > 0 && (
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              API keys ({keyPrefixes.join(', ')}) are still required for Zendesk, Chrome, and direct API calls.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Widget URL
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs leading-relaxed"
            style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
          >
            {widgetUrl}
          </pre>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Widget Token: used only for the Gorgias URL. Separate from your API key so you can rotate independently.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void copyUrl()}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy widget URL'}
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Sidebar preview
        </p>
        <div className="flex gap-6 items-start flex-wrap">
          <div
            className="w-[300px] shrink-0 rounded-lg border p-3 text-xs"
            style={{
              borderColor: 'var(--surface-border)',
              background: '#14100e',
              color: '#f5f0eb',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div
              className="rounded-md p-3 border"
              style={{ background: '#3d0e0a', borderColor: '#e8362a', color: '#fde8e6' }}
            >
              <p className="font-bold text-sm">🔴 HIGH RISK</p>
              <p className="mt-1 opacity-90">Definite · Score 87</p>
              <p className="mt-3 text-[10px] uppercase opacity-60">Signals</p>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                <li>Refund abuse, 4 merchants</li>
                <li>Address cluster</li>
              </ul>
              <div
                className="mt-3 rounded px-2 py-1.5"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
                4 merchants · 6 claims
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <span
                  className="block text-center rounded py-1.5 font-semibold"
                  style={{ background: '#c8763a', color: '#fff' }}
                >
                  View Profile
                </span>
                <span
                  className="block text-center rounded py-1.5 border"
                  style={{ borderColor: '#3d2e28', color: '#c8763a' }}
                >
                  Get PDF
                </span>
              </div>
            </div>
            <p className="text-right mt-2 opacity-40">Unauth</p>
          </div>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Approximate appearance inside Gorgias (~300px sidebar). Risk colours change based on
            customer grade.
          </p>
        </div>
      </div>
    </div>
  );
}
