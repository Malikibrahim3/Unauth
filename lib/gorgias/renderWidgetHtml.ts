import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  claimWidgetToJson,
  isCreditGatedWidgetPreview,
  type GorgiasWidgetJsonOptions,
  type GorgiasWidgetLinkContext,
} from '@/lib/gorgias/widgetJson';
import type { GorgiasClaimWidgetResult } from '@/lib/gorgias/widgetData';
import { GORGIAS_SIDEBAR_CARD_TITLE, GORGIAS_SIDEBAR_ROW_LABELS } from '@/lib/support/gorgias/registerSidebarWidget';
import { env } from '@/lib/utils/env';

const BRAND_WORDMARK_DATA_URI = `data:image/svg+xml;base64,${readFileSync(
  resolve(process.cwd(), 'public/brand/unauth-r1/unauth-r1-wordmark-graphite.svg'),
).toString('base64')}`;

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
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px; line-height: 1.45; color: #18181b;
      background: #f7f7f8; padding: 12px; max-width: 320px;
    }
    .card { border-radius: 9px; border: 1px solid #e4e4e7; padding: 14px; background: #ffffff; }
    .title { font-size: 15px; font-weight: 650; letter-spacing: -0.02em; margin-bottom: 12px; line-height: 1.3; }
    table.cmp { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.cmp th, table.cmp td {
      text-align: left;
      padding: 8px 4px;
      font-size: 12px;
      vertical-align: top;
      white-space: normal;
      overflow-wrap: break-word;
      word-break: normal;
      hyphens: auto;
    }
    table.cmp thead th { font-size: 10px; text-transform: none; letter-spacing: 0; color: #71717a; }
    table.cmp tbody th { font-weight: 600; opacity: 0.85; width: 34%; }
    table.cmp td { opacity: 0.95; }
    .grade, .claims, .ce3, .no-network, .watchlist {
      white-space: normal;
      overflow-wrap: break-word;
      word-break: normal;
      hyphens: auto;
    }
    .grade { font-size: 18px; font-weight: 650; letter-spacing: -0.025em; margin-bottom: 4px; line-height: 1.3; }
    .claims { font-size: 12px; opacity: 0.9; margin-bottom: 10px; line-height: 1.4; }
    .ce3 { margin-top: 10px; padding-left: 8px; border-left: 2px solid #5b5bd6; font-size: 11px; color: #3c3c96; }
    .clean { color: #237a4b; }
    .no-network { color: #52525b; font-size: 12px; }
    .cta { display: block; margin-top: 12px; text-align: center; padding: 8px 10px;
           border-radius: 7px; font-size: 12px; font-weight: 600; text-decoration: none;
           background: #5b5bd6; color: #fff; }
    .brand { margin-top: 10px; text-align: right; }
    .brand img { display: inline-block; width: 64px; height: auto; }
    .watchlist { font-size: 12px; margin-top: 6px; }
    .warn { color: #8a6116; font-weight: 600; font-size: 12px; margin-top: 6px; }
    .context-summary { font-size: 12px; opacity: 0.85; margin-bottom: 10px; line-height: 1.4; }
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
  <div class="brand"><img src="${BRAND_WORDMARK_DATA_URI}" alt="Unauth" /></div>
</body>
</html>`;
}

export function renderGorgiasWidgetHtml(ctx: ClaimWidgetRenderContext): string {
  const { result, link, options } = ctx;
  const isDisconnected = !result.ok && result.kind === 'helpdesk_disconnected';
  const creditGatedPreview = isCreditGatedWidgetPreview(options);
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
    const inner = `
      <div class="context-summary">${escapeHtml(json.context_summary)}</div>
      <div class="grade">—</div>
      <table class="cmp">
        <tbody>
          <tr><th>${escapeHtml(rowLabels.customer_action)}</th><td>—</td></tr>
          <tr><th>${escapeHtml(rowLabels.responsibility)}</th><td>—</td></tr>
          <tr><th>${escapeHtml(rowLabels.recovery_recommendation)}</th><td>—</td></tr>
          <tr><th>${escapeHtml(rowLabels.why)}</th><td>—</td></tr>
          <tr><th>${escapeHtml(rowLabels.missing_evidence)}</th><td>—</td></tr>
        </tbody>
      </table>
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
  const watchlist = json.watchlisted?.replace(/^⚠\s*/, '') ?? '';
  const inner = `
    ${json.order_context && json.order_context !== '—' ? `<div class="context-summary">${escapeHtml(json.order_context)}</div>` : ''}
    <div class="context-summary">${escapeHtml(json.context_summary)}</div>
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
    ${watchlist && watchlist !== '—' ? `<div class="watchlist${json.watchlisted.startsWith('⚠') ? ' warn' : ''}">${escapeHtml(watchlist)}</div>` : ''}
    ${ctaUrl ? `<a class="cta" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>` : ''}
  `;

  return page(inner);
}

export const GORGIAS_FRAME_HEADERS = {
  'Content-Security-Policy': 'frame-ancestors https://*.gorgias.com',
} as const;
