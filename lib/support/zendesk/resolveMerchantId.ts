import { z } from 'zod';
import { env } from '@/lib/utils/env';

export const ZENDESK_MERCHANT_ID_HEADER = 'x-unauth-merchant-id';

const uuidSchema = z.string().uuid();

export type ZendeskDevMerchantResolution =
  | { merchantId: string; source: 'header' | 'env' }
  | { error: 'missing' | 'invalid_header' | 'env_not_allowed' | 'disabled_in_production' };

export type ResolveZendeskDevMerchantOptions = {
  headerMerchantId?: string | null;
  testMerchantId?: string | null;
  allowEnvMerchantInProduction?: boolean;
  nodeEnv?: string;
  vercelEnv?: string;
};

export function isZendeskDevMerchantFallbackAllowed(
  options: ResolveZendeskDevMerchantOptions = {}
): boolean {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const vercelEnv = options.vercelEnv ?? env.VERCEL_ENV;
  return (
    options.allowEnvMerchantInProduction === true ||
    env.ZENDESK_SUPPORT_ALLOW_ENV_MERCHANT === 'true' ||
    nodeEnv === 'development' ||
    nodeEnv === 'test' ||
    vercelEnv === 'development'
  );
}

export function isZendeskProductionIngestMode(
  options: ResolveZendeskDevMerchantOptions = {}
): boolean {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const vercelEnv = options.vercelEnv ?? env.VERCEL_ENV;
  const isProd = nodeEnv === 'production' || vercelEnv === 'production' || vercelEnv === 'preview';
  return isProd && !isZendeskDevMerchantFallbackAllowed(options);
}

export function resolveZendeskDevMerchantFallback(
  options: ResolveZendeskDevMerchantOptions = {}
): ZendeskDevMerchantResolution {
  if (isZendeskProductionIngestMode(options)) {
    return { error: 'disabled_in_production' };
  }

  if (!isZendeskDevMerchantFallbackAllowed(options)) {
    return { error: 'env_not_allowed' };
  }

  const headerValue = options.headerMerchantId?.trim();
  if (headerValue) {
    const parsed = uuidSchema.safeParse(headerValue);
    if (!parsed.success) {
      return { error: 'invalid_header' };
    }
    return { merchantId: parsed.data, source: 'header' };
  }

  const testMerchantId =
    options.testMerchantId !== undefined
      ? options.testMerchantId
      : env.ZENDESK_SUPPORT_TEST_MERCHANT_ID ?? null;

  if (!testMerchantId) {
    return { error: 'missing' };
  }

  const parsedEnv = uuidSchema.safeParse(testMerchantId);
  if (!parsedEnv.success) {
    return { error: 'missing' };
  }

  return { merchantId: parsedEnv.data, source: 'env' };
}
