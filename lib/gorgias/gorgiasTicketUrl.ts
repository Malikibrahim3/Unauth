/**
 * Safe Gorgias helpdesk ticket deep link for widget unlock result pages.
 * No secrets — only public base URL + ticket id.
 */
export function buildGorgiasTicketAppUrl(
  providerBaseUrl: string | null | undefined,
  ticketRef: string | null | undefined,
): string | null {
  const ticketId = ticketRef?.trim() ?? '';
  if (!ticketId || !/^\d+$/.test(ticketId)) return null;

  const raw = providerBaseUrl?.trim() ?? '';
  if (!raw) return null;

  let base = raw.replace(/\/$/, '');
  if (base.endsWith('/api')) base = base.slice(0, -4);
  if (!/^https:\/\/[a-z0-9.-]+\.gorgias\.com$/i.test(base)) return null;

  return `${base}/app/ticket/${encodeURIComponent(ticketId)}`;
}
