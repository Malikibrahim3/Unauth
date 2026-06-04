import {
  claimWidgetToJson,
  useCreditGatedWidgetPreview,
  type GorgiasWidgetJsonOptions,
  type GorgiasWidgetLinkContext,
} from '@/lib/gorgias/widgetJson';
import type { GorgiasClaimWidgetResult } from '@/lib/gorgias/widgetData';
import { GORGIAS_SIDEBAR_CARD_TITLE, GORGIAS_SIDEBAR_ROW_LABELS } from '@/lib/support/gorgias/registerSidebarWidget';
import { env } from '@/lib/utils/env';

/**
 * HTML preview of the Gorgias sidebar widget (opt-in via ?format=html). The
 * production Gorgias path is JSON; this mirrors it as a two-column card for
 * manual preview. No risk score and no "fraud" wording is rendered.
 */
export type ClaimWidgetRenderContext = {
  result: GorgiasClaimWidgetResult;
  profileUrl: string | null;
  link?: GorgiasWidgetLinkContext;
  options?: GorgiasWidgetJsonOptions;
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
    .usage-banner { margin-bottom: 10px; padding: 8px 10px; border-radius: 6px; background: rgba(200, 118, 58, 0.12); border: 1px solid rgba(200, 118, 58, 0.35); font-size: 12px; line-height: 1.4; }
    .usage-banner a { color: #c8763a; font-weight: 600; }
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
  <title>${escapeHtml(GORGIAS_SIDEBAR_CARD_TITLE)}</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card">
    <div class="title">${escapeHtml(GORGIAS_SIDEBAR_CARD_TITLE)}</div>
    ${inner}
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
}

export function renderGorgiasWidgetHtml(ctx: ClaimWidgetRenderContext): string {
  const { result, link, options } = ctx;
  const isDisconnected = !result.ok && result.kind === 'helpdesk_disconnected';
  const creditGatedPreview = useCreditGatedWidgetPreview(options);
  const rowLabels = GORGIAS_SIDEBAR_ROW_LABELS;

  if (!result.ok && !creditGatedPreview) {
    const message =
      result.kind === 'not_found'
        ? 'Not seen at any store yet'
        : result.message ?? 'Could not load case context.';
    return page(`<p class="no-network">${escapeHtml(message)}</p>`);
  }

  const json = claimWidgetToJson(result, link, options);
  const profileUrl = ctx.profileUrl ?? (result.ok ? result.data.profileUrl : null) ?? '';
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const connectUrl = `${appBase}/settings/integrations/gorgias`;
  const ctaUrl = isDisconnected ? connectUrl : profileUrl || json.cta_url;
  const ctaLabel = isDisconnected ? 'Connect to Unauth →' : json.cta_label;

  if (creditGatedPreview) {
    const usageBanner =
      json.credit_usage_banner && json.credit_topup_url
        ? `<div class="usage-banner"><p>${escapeHtml(json.credit_usage_banner)}</p><a href="${escapeHtml(json.credit_topup_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(json.credit_topup_label ?? 'View options')}</a></div>`
        : json.credit_usage_banner
          ? `<div class="usage-banner"><p>${escapeHtml(json.credit_usage_banner)}</p></div>`
          : '';
    const inner = `
      ${usageBanner}
      <div class="grade">${escapeHtml(json.identity)}</div>
      <table class="cmp">
        <tbody>
          <tr><th>${escapeHtml(rowLabels.claims)}</th><td>${escapeHtml(json.claims)}</td></tr>
          <tr><th>${escapeHtml(rowLabels.orders)}</th><td>${escapeHtml(json.orders)}</td></tr>
          <tr><th>${escapeHtml(rowLabels.claim_rate)}</th><td>${escapeHtml(json.claim_rate)}</td></tr>
          <tr><th>${escapeHtml(rowLabels.primary_reason)}</th><td>${escapeHtml(json.primary_reason)}</td></tr>
          <tr><th>${escapeHtml(rowLabels.recent_activity)}</th><td>${escapeHtml(json.recent_activity)}</td></tr>
        </tbody>
      </table>
      ${json.ce3_evidence && json.ce3_evidence !== '—' ? `<div class="ce3"><strong>${escapeHtml(rowLabels.ce3_evidence)}</strong> ${escapeHtml(json.ce3_evidence)}</div>` : ''}
      ${json.watchlisted ? `<div class="watchlist"><strong>${escapeHtml(rowLabels.watchlisted)}</strong> ${escapeHtml(json.watchlisted)}</div>` : ''}
      ${ctaUrl ? `<a class="cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>` : ''}
    `;
    return page(inner);
  }

  if (!result.ok) {
    const message = result.message ?? 'Could not load case context.';
    return page(`<p class="no-network">${escapeHtml(message)}</p>`);
  }

  const { thisStore } = result.data;
  const cleanClaims = json.claims === 'No prior claims on record';
  const inner = `
    <div class="grade">${escapeHtml(json.identity)}</div>
    <div class="claims${cleanClaims ? ' clean' : ''}">${escapeHtml(json.claims)}</div>
    <table class="cmp">
      <thead>
        <tr><th></th><th>Context action</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr>
          <th>Store</th>
          <td>${escapeHtml(json.orders)}</td>
          <td>${escapeHtml(json.primary_reason)}</td>
        </tr>
        <tr>
          <th>Network</th>
          <td>${escapeHtml(json.claim_rate)}</td>
          <td>${escapeHtml(json.recent_activity)}</td>
        </tr>
        <tr>
          <th>This store</th>
          <td>${dash(thisStore.orderCount)} orders</td>
          <td>${dash(wholePct(thisStore.claimRate))} claim rate</td>
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
