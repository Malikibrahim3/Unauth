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
