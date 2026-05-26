export const dynamic = 'force-dynamic';

const ENV_VARS = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_WEBHOOK_SECRET',
] as const;

type ShopifyEnvVar = (typeof ENV_VARS)[number];

function hasEnvVar(name: ShopifyEnvVar): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export function GET() {
  const result = Object.fromEntries(
    ENV_VARS.map((name) => [name, hasEnvVar(name)])
  ) as Record<ShopifyEnvVar, boolean>;

  return Response.json(result, { status: 200 });
}
