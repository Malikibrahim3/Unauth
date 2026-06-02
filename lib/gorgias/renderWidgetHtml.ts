import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';
import type { GorgiasClaimWidgetResult } from '@/lib/gorgias/widgetData';
import { env } from '@/lib/utils/env';

/**
 * HTML preview of the Gorgias sidebar widget (opt-in via ?format=html). The
 * production Gorgias path is JSON; this mirrors it as a two-column card for
 * manual preview. No risk score and no "fraud" wording is rendered.
 */
export type ClaimWidgetRenderContext = {
  result: GorgiasClaimWidgetResult;
  profileUrl: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px; line-height: 1.45; color: #f5f0eb;
      background: #14100e; padding: 12px; max-width: 320px;
    }
    .card { border-radius: 8px; border: 1px solid #3d2e28; padding: 12px; background: #1c1714; }
    .title { font-size: 14px; font-weight: 700; margin-bottom: 10px; line-height: 1.3; }
    table.cmp { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.cmp th, table.cmp td {
      text-align: left;
      padding: 6px 4px;
      font-size: 12px;
      vertical-align: top;
      white-space: normal;
      overflow-wrap: break-word;
      word-break: normal;
      hyphens: auto;
    }
    table.cmp thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }
    table.cmp tbody th { font-weight: 600; opacity: 0.85; width: 34%; }
    table.cmp td { opacity: 0.95; }
    .grade, .claims, .ce3, .no-network, .watchlist {
      white-space: normal;
      overflow-wrap: break-word;
      word-break: normal;
      hyphens: auto;
    }
    .grade { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3; }
    .claims { font-size: 12px; opacity: 0.9; margin-bottom: 10px; line-height: 1.4; }
    .ce3 { margin-top: 10px; font-size: 11px; color: #8fb7d6; }
    .clean { color: #6fcf97; }
    .no-network { color: #6fcf97; font-size: 12px; }
    .cta { display: block; margin-top: 12px; text-align: center; padding: 8px 10px;
           border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;
           background: #c8763a; color: #fff; }
    .brand { font-size: 10px; color: #6b5c54; margin-top: 10px; text-align: right; }
    .watchlist { font-size: 12px; margin-top: 6px; }
    .warn { color: #f2994a; font-weight: 600; font-size: 12px; margin-top: 6px; }
  `;
}

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return escapeHtml(String(value));
}

function wholePct(rate0to1: number): string {
  return `${Math.round(rate0to1 * 100)}%`;
}

function page(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unauth Identity Intelligence</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="title">Unauth Identity Intelligence</div>
    ${inner}
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
}

export function renderGorgiasWidgetHtml(ctx: ClaimWidgetRenderContext): string {
  const { result } = ctx;
  const isDisconnected = !result.ok && result.kind === 'helpdesk_disconnected';

  if (!result.ok) {
    const message =
      result.kind === 'not_found'
        ? 'Not seen at any store yet'
        : result.message ?? 'Could not load identity intelligence.';
    return page(`<p class="no-network">${escapeHtml(message)}</p>`);
  }

  const { thisStore, network } = result.data;
  const json = claimWidgetToJson(result);
  const profileUrl = ctx.profileUrl ?? result.data.profileUrl ?? '';
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const connectUrl = `${appBase}/settings/integrations`;
  const ctaUrl = isDisconnected ? connectUrl : profileUrl;
  const ctaLabel = isDisconnected
    ? 'Connect to Unauth →'
    : 'View full profile in Unauth →';

  const networkCell = (value: string) =>
    network ? dash(value) : '<span class="no-network">No network history found</span>';

  const primaryReason = network ? dash(json.primary_reason) : '<span class="no-network">No network history found</span>';
  const recent = network ? dash(json.recent_activity) : '<span class="no-network">No network history found</span>';

  const cleanClaims = json.claims === 'No prior claims on record';
  const inner = `
    <div class="grade">${escapeHtml(json.identity)}</div>
    <div class="claims${cleanClaims ? ' clean' : ''}">${escapeHtml(json.claims)}</div>
    <table class="cmp">
      <thead>
        <tr><th></th><th>This Store</th><th>Network (All-time)</th></tr>
      </thead>
      <tbody>
        <tr>
          <th>Orders</th>
          <td>${dash(thisStore.orderCount)}</td>
          <td>${networkCell(network ? `${network.orderCount} across ${network.merchantCount} merchants` : '')}</td>
        </tr>
        <tr>
          <th>Claim rate</th>
          <td>${dash(wholePct(thisStore.claimRate))}</td>
          <td>${networkCell(network && network.orderCount > 0 ? wholePct(network.claimRate) : '—')}</td>
        </tr>
        <tr>
          <th>Primary reason</th>
          <td>—</td>
          <td>${primaryReason}</td>
        </tr>
        <tr>
          <th>Last 90 days</th>
          <td>—</td>
          <td>${recent}</td>
        </tr>
      </tbody>
    </table>
    ${json.ce3_evidence && json.ce3_evidence !== '—' ? `<div class="ce3">${escapeHtml(json.ce3_evidence)}</div>` : ''}
    ${json.watchlisted && json.watchlisted !== '—' ? `<div class="watchlist${json.watchlisted.startsWith('⚠') ? ' warn' : ''}">${escapeHtml(json.watchlisted)}</div>` : ''}
    ${ctaUrl ? `<a class="cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>` : ''}
  `;

  return page(inner);
}

export const GORGIAS_FRAME_HEADERS = {
  'Content-Security-Policy': 'frame-ancestors https://*.gorgias.com',
} as const;
