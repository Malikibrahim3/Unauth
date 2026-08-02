import { loadDotenvFiles } from '@/lib/utils/loadDotenv';

loadDotenvFiles();

process.env.IDENTITY_SALT =
  process.env.IDENTITY_SALT ||
  'test-salt-0000000000000000000000000000000000000000000000000000000000000000';

process.env.INTERNAL_SUPPORT_INGEST_SECRET =
  process.env.INTERNAL_SUPPORT_INGEST_SECRET ||
  'test-internal-support-ingest-secret-32chars-min';

// Test-only override; the real runtime secret in .env.local/Vercel must still satisfy min(32).
process.env.GORGIAS_SUPPORT_WEBHOOK_SECRET = 'test-gorgias-support-webhook-secret-32chars-min';

process.env.GORGIAS_SUPPORT_TEST_MERCHANT_ID =
  process.env.GORGIAS_SUPPORT_TEST_MERCHANT_ID ||
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// jsdom (unlike every real browser) does not implement `matchMedia`. Living
// Precision's shared `useMotionAllowed` hook (LP-MOT-11) — and everything
// built on it: Modal, Drawer, Toast, Tooltip, menus, chart motion, route
// progress — reads it on mount, so any `@jest-environment jsdom` test that
// renders one of those crashes without this polyfill. Guarded because
// `setupFiles` also runs for plain `node`-environment test files.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
