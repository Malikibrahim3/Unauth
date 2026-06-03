import { CONTEXT_REVIEW_DISCLAIMER } from '@/lib/api/lookup/contextLookupCore';
import type { FormattedContextResult } from '@/lib/api/lookup/contextLookupCore';
import type { ContextUnlockType } from '@/lib/billing/contextCredits';
import { getContextCreditCost } from '@/lib/billing/contextCredits';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contextTypeLabel(contextType: ContextUnlockType): string {
  switch (contextType) {
    case 'basic_context':
      return 'Basic store context';
    case 'full_context':
      return 'Full context (store + network)';
    case 'evidence_summary':
      return 'Evidence summary';
    default:
      return 'Context unlock';
  }
}

function renderResultBlock(
  result: FormattedContextResult,
  contextType: ContextUnlockType,
): string {
  const points = result.context_points.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
  const network =
    contextType === 'full_context' && result.network_context
      ? `<section class="block">
           <h2>Pseudonymous network context</h2>
           <p class="muted">${escapeHtml(result.network_context.note)}</p>
           <p class="muted">Participating merchants in pattern: ${result.network_context.merchantsSeen}</p>
         </section>`
      : '';
  const email = result.store_context.primaryEmail
    ? escapeHtml(result.store_context.primaryEmail)
    : '—';
  return `
    <section class="block">
      <h2>Store context</h2>
      <p><strong>Orders (this store):</strong> ${result.store_context.orders} · <strong>Claims:</strong> ${result.store_context.claims} · <strong>Claim rate:</strong> ${Math.round(result.store_context.refundRate * 100)}%</p>
      <p><strong>Primary email (this store):</strong> ${email}</p>
      <ul>${points}</ul>
    </section>
    ${network}
  `;
}

function formatCreditShortfallMessage(input: {
  contextType: ContextUnlockType;
  requiredCredits: number;
  remainingCredits: number | null;
  fallbackError?: string;
}): string {
  const required = input.requiredCredits || getContextCreditCost(input.contextType);
  if (input.remainingCredits != null) {
    return `This action requires ${required} credit${required === 1 ? '' : 's'}. You have ${input.remainingCredits} remaining.`;
  }
  return input.fallbackError ?? 'Not enough context credits remaining.';
}

function renderReturnToTicketBlock(gorgiasTicketUrl: string | null | undefined): string {
  if (gorgiasTicketUrl) {
    return `<p class="return"><a href="${escapeHtml(gorgiasTicketUrl)}" rel="noopener noreferrer">Return to Gorgias ticket</a></p>`;
  }
  return '<p class="muted return">You can close this tab and return to the ticket in Gorgias.</p>';
}

export function renderWidgetUnlockHtml(input: {
  contextType: ContextUnlockType;
  results: FormattedContextResult[];
  creditsSpent: number;
  remainingCredits: number;
  ticketRef: string | null;
  orderRef: string | null;
  claimId?: string | null;
  gorgiasTicketUrl?: string | null;
  error?: string;
  insufficientCredits?: boolean;
  planGate?: boolean;
  requiredCredits?: number;
}): string {
  const unlocked = !input.error && input.results.length > 0;
  const title = unlocked
    ? `${contextTypeLabel(input.contextType)} unlocked`
    : 'Context unlock unavailable';

  const body = input.insufficientCredits
    ? `<p class="warn">${escapeHtml(
        formatCreditShortfallMessage({
          contextType: input.contextType,
          requiredCredits: input.requiredCredits ?? getContextCreditCost(input.contextType),
          remainingCredits: input.remainingCredits,
          fallbackError: input.error,
        }),
      )}</p>
       <p class="muted">Upgrade for more monthly context credits, or wait for your allowance to refresh. No context was unlocked for this case.</p>`
    : input.planGate
      ? `<p class="warn">${escapeHtml(input.error ?? 'This unlock type is not available on your plan.')}</p>
         <p class="muted">No context was unlocked for this case.</p>`
      : input.error
        ? `<p class="warn">${escapeHtml(input.error)}</p>`
        : input.results.length === 0
          ? `<p class="muted">No matching context profile was found for this case. No credits were spent.</p>`
          : `${input.results.map((r) => renderResultBlock(r, input.contextType)).join('')}
             <p class="meta">Credits spent: ${input.creditsSpent} · Remaining: ${input.remainingCredits}</p>`;

  const scope = [
    input.ticketRef ? `Ticket ${escapeHtml(input.ticketRef)}` : null,
    input.orderRef ? `Order ${escapeHtml(input.orderRef)}` : null,
    input.claimId ? `Claim ${escapeHtml(input.claimId)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #f5f0eb; background: #14100e; padding: 20px; max-width: 640px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    h2 { font-size: 14px; margin: 12px 0 6px; }
    .card { background: #1c1714; border: 1px solid #3d2e28; border-radius: 8px; padding: 16px; }
    .muted { color: #9a8f88; font-size: 13px; margin-top: 8px; }
    .warn { color: #f2994a; font-weight: 600; }
    .meta { margin-top: 12px; font-size: 12px; color: #c8763a; }
    ul { margin: 8px 0 0 18px; }
    .disclaimer { margin-top: 16px; font-size: 12px; color: #6b5c54; }
    .scope { font-size: 12px; color: #9a8f88; margin-bottom: 12px; }
    .return { margin-top: 14px; }
    .return a { color: #c8763a; font-weight: 600; text-decoration: none; }
    .return a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    ${scope ? `<p class="scope">${scope}</p>` : ''}
    ${body}
    ${input.ticketRef ? renderReturnToTicketBlock(input.gorgiasTicketUrl) : ''}
    <p class="disclaimer">${escapeHtml(CONTEXT_REVIEW_DISCLAIMER)}</p>
    <p class="disclaimer">Cost for this unlock type: ${getContextCreditCost(input.contextType)} credit(s).</p>
  </div>
</body>
</html>`;
}
