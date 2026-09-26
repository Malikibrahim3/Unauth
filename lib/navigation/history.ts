/**
 * Update same-origin URL state only when the address bar would actually
 * change. Next.js observes native history calls, so no-op replacements can
 * unnecessarily re-enter the App Router.
 */
export function replaceHistoryUrlIfChanged(href: string): void {
  if (typeof window === 'undefined') return;

  const current = new URL(window.location.href);
  const next = new URL(href, current.href);
  if (next.origin !== current.origin) return;

  if (
    next.pathname === current.pathname
    && next.search === current.search
    && next.hash === current.hash
  ) return;

  window.history.replaceState(null, '', `${next.pathname}${next.search}${next.hash}`);
}
