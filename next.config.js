/** @type {import('next').NextConfig} */

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
  serverExternalPackages: ['papaparse'],
  transpilePackages: ['three'],
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1'],
  // The Chrome download route reads extension files from disk at runtime.
  // Next's tracer can't follow the dynamic process.cwd() reads, so include them
  // explicitly or the route 404s on Vercel's serverless filesystem.
  outputFileTracingIncludes: {
    '/api/settings/chrome/download': ['./extensions/chrome/dist/**/*'],
  },
  async redirects() {
    // Backward-compat aliases for renamed routes. Page-level redirect stubs were
    // removed in favour of these config redirects so the route tree stays clean
    // while old bookmarks/links keep working.
    return [
      { source: '/inbox', destination: '/claims', permanent: false },
      { source: '/audits', destination: '/history', permanent: false },
      { source: '/audit-history', destination: '/history', permanent: false },
      { source: '/saved', destination: '/history', permanent: false },
      { source: '/new-audit', destination: '/upload', permanent: false },
      { source: '/audits/new', destination: '/upload', permanent: false },
      { source: '/evidence', destination: '/chargebacks', permanent: false },
      { source: '/evidence-packages', destination: '/chargebacks', permanent: false },
      { source: '/clusters', destination: '/customers?merchantsMin=2', permanent: false },
      { source: '/graph', destination: '/global', permanent: false },
      { source: '/report/:runId', destination: '/audit/:runId', permanent: false },
    ];
  },
  // SECURITY: Explicit image optimizer allowlist — mitigates GHSA-9g9p-9gw9-jx7f.
  // Uses the exact Supabase project hostname derived from NEXT_PUBLIC_SUPABASE_URL.
  // No wildcard patterns. If NEXT_PUBLIC_SUPABASE_URL is unset, remotePatterns
  // is empty and image optimisation is disabled (fail-closed).
  images: {
    remotePatterns,
  },
};

module.exports = nextConfig;
