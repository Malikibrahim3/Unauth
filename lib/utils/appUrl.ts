import { env } from '@/lib/utils/env';

/**
 * Canonical app base URL (no trailing slash). Checks the server-only APP_URL
 * override first, then the public app URL, then the Vercel deployment URL,
 * falling back to localhost only for local dev. This is the single source of
 * truth — do not re-derive this fallback chain at other call sites.
 */
export function getAppUrl(): string {
  const explicit = (env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}
