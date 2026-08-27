/** @type {import('next').NextConfig} */

const { LEGACY_UI_REDIRECTS } = require('./lib/navigation/aliases.js');

// SECURITY: Resolve the project-specific Supabase storage hostname at build
// time from NEXT_PUBLIC_SUPABASE_URL.  Wildcards (*.supabase.co) are not
// permitted — they would allow any Supabase project to supply images and
// trigger the Next.js image-optimizer vulnerability (GHSA-9g9p-9gw9-jx7f).
//
// If NEXT_PUBLIC_SUPABASE_URL is absent (CI without env, etc.) we deliberately
// omit the remotePatterns entry so image optimisation fails closed rather than
// falling back to a wildcard.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
let supabaseHostname = null;
try {
  if (supabaseUrl) {
    supabaseHostname = new URL(supabaseUrl).hostname; // e.g. abcdefghij.supabase.co
  }
} catch {
  // Malformed URL — fail closed (no remotePatterns entry)
}

const remotePatterns = supabaseHostname
  ? [
      {
        protocol: 'https',
        hostname: supabaseHostname, // exact project hostname — no wildcards
        pathname: '/storage/v1/object/public/**',
      },
    ]
  : [];

const nextConfig = {
  // A task-specific dist directory lets verification run beside a developer's
  // existing server without sharing or corrupting its generated lock/cache.
  distDir: process.env.UNAUTH_NEXT_DIST_DIR || '.next',
  // Keep the authenticated working set warm in the Webpack fallback. The app
  // has substantially more than Next's five-entry development default, which
  // otherwise evicts a route after one minute and recompiles it on the next click.
  onDemandEntries: {
    maxInactiveAge: 30 * 60 * 1000,
    pagesBufferLength: 32,
  },
  serverExternalPackages: ['papaparse'],
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1'],
  // The Chrome download route reads extension files from disk at runtime.
  // Next's tracer can't follow the dynamic process.cwd() reads, so include them
  // explicitly or the route 404s on Vercel's serverless filesystem.
  outputFileTracingIncludes: {
    '/api/settings/chrome/download': ['./extensions/chrome/dist/**/*'],
  },
  async headers() {
    // Baseline security headers applied to every response. A Content-Security-
    // Policy is intentionally NOT set here yet — it must be authored against the
    // app's real script/style sources and rolled out Report-Only first (a
    // /api/csp-report collector already exists). The headers below are safe to
    // enforce immediately and do not change functionality.
    // Report-Only CSP: collects violations at /api/csp-report WITHOUT blocking,
    // so the policy can be tightened (drop 'unsafe-inline'/'unsafe-eval', pin
    // connect-src hosts) from real data before switching to an enforcing
    // Content-Security-Policy header. Safe to ship as-is.
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'report-uri /api/csp-report',
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      { source: '/records/:type/:id', destination: '/financials/reports/records?kind=:type&value=:id' },
      { source: '/recovery/:claimId', destination: '/financials/recovery/:claimId' },
      { source: '/controls/payout-rules/:id/versions', destination: '/controls/rules/:id' },
      { source: '/controls/flows/:id/edit', destination: '/controls/flows/:id' },
      { source: '/sources/:provider/setup', destination: '/sources/setup/:provider' },
      { source: '/settings/workspace', destination: '/settings/workspace/account' },
      { source: '/settings/roles', destination: '/settings/workspace/team' },
      { source: '/system-states', destination: '/help' },
    ];
  },
  async redirects() {
    // Compatibility redirects for URLs that were previously shipped or linked
    // externally. Keep this as the only legacy-route source of truth. Remove an
    // entry after production access logs show no requests for 90 days; the web
    // platform owner owns that review.
    return [...LEGACY_UI_REDIRECTS];
  },
  // SECURITY: Explicit image optimizer allowlist — mitigates GHSA-9g9p-9gw9-jx7f.
  // Uses the exact Supabase project hostname derived from NEXT_PUBLIC_SUPABASE_URL.
  // No wildcard patterns. If NEXT_PUBLIC_SUPABASE_URL is unset, remotePatterns
  // is empty and image optimisation is disabled (fail-closed).
  images: {
    remotePatterns,
    // Next 16 ignores any <Image quality> value that is not allow-listed here and
    // silently falls back to 75. The landing hero screenshot is dense product UI,
    // so it opts into 90 to keep small type and chart strokes crisp.
    qualities: [75, 90],
  },
};

module.exports = nextConfig;
