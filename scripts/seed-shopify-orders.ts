/**
 * Seed a Shopify development store with adversarial, synthetic customer
 * identities and paid orders.
 *
 * This intentionally uses the Admin REST API rather than the browser UI.  It
 * creates one customer record per identity variant, then creates orders for
 * those customers with varied products, prices, tags, and shipping snapshots.
 * All records are synthetic and tagged `unauth-seed` for later cleanup.
 *
 * Examples:
 *   pnpm seed:shopify -- --dry-run --count 120 --customers 30
 *   pnpm seed:shopify -- --count 120 --customers 30 --orders-per-customer 4 --order-pace-ms 13000
 *
 * Required environment variables (loaded from .env.local/.env):
 *   SHOPIFY_STORE_DOMAIN
 *   SHOPIFY_API_KEY + SHOPIFY_API_SECRET (preferred; client-credentials flow)
 *
 * A legacy SHOPIFY_ADMIN_API_TOKEN is still accepted when the app client
 * credentials are not present.  Dev Dashboard tokens are short-lived, so the
 * client-credentials flow keeps the token in memory and never prints it.
 */

import './e2e/helpers/loadEnv';

type Address = {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  province_code: string;
  zip: string;
  country: string;
  country_code: string;
  phone: string;
};

type Customer = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  default_address?: Address;
};

type Order = {
  id: number;
  name: string;
  order_number: number;
  email: string;
  total_price: string;
};

type ShopifyError = { errors?: unknown };

type Profile = {
  cluster: number;
  variant: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
};

type Options = {
  count: number;
  customers: number;
  ordersPerCustomer?: number;
  paceMs: number;
  orderPaceMs: number;
  dryRun: boolean;
};

const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION?.trim() || '2025-10';
const SEED_TAG = 'unauth-seed';
// Keep reruns collision-free while preserving the same near-match structure
// inside one run. The run tag is included on every customer and order so a
// batch can be found and removed later without touching unrelated test data.
const RUN_ID = Date.now().toString(36).slice(-8);
const RUN_TAG = `${SEED_TAG}-${RUN_ID}`;
const PHONE_RUN_SEED = Math.floor(Math.random() * 1_000_000);

const FIRST_NAMES = [
  ['Morgan', 'Ellis'],
  ['Morgan', 'Eliss'],
  ['Morgann', 'Ellis'],
  ['Casey', 'Rowan'],
  ['Kasey', 'Rowan'],
  ['Casey', 'Rohan'],
  ['Taylor', 'Ng'],
  ['Tayler', 'Ng'],
  ['Taylor', 'Eng'],
  ['Jordan', 'Patel'],
  ['Jordon', 'Patel'],
  ['Jordan', 'Patil'],
  ['Avery', 'Stone'],
  ['Averie', 'Stone'],
  ['Avery', 'Stoen'],
  ['Riley', 'Vale'],
  ['Rylee', 'Vale'],
  ['Riley', 'Vail'],
  ['Cameron', 'Lane'],
  ['Cam', 'Lane'],
  ['Cameron', 'Laine'],
  ['Parker', 'Sloan'],
  ['Parker', 'Sloane'],
  ['Parkar', 'Sloan'],
  ['Reese', 'Pike'],
  ['Reece', 'Pike'],
  ['Reese', 'Pyke'],
  ['Jamie', 'Wren'],
  ['Jaime', 'Wren'],
  ['Jamie', 'Wrenn'],
  ['Drew', 'Hart'],
  ['Drue', 'Hart'],
  ['Drew', 'Heart'],
  ['Quinn', 'Quill'],
  ['Quin', 'Quill'],
  ['Quinn', 'Quil'],
];

const CITY_ZIPS = [
  ['Testville', '90001'],
  ['Mock City', '90002'],
  ['Demo Falls', '90002'],
  ['Sampletown', '90002'],
  ['Exampleton', '90003'],
];

const STREET_FORMS = [
  'Identity Test Street',
  'Identity Test St',
  'Test Avenue',
  'Test Ave',
  'Example Road',
  'Sample Lane',
];

const PRODUCTS = [
  ['Synthetic Wax Sample', '9.95'],
  ['Identity Test Hoodie', '24.00'],
  ['Fixture Candle', '18.50'],
  ['Sandbox Mug', '12.75'],
  ['QA Tote', '16.25'],
  ['Demo Sticker Pack', '4.50'],
];

type ClientCredentialsToken = {
  accessToken: string;
  expiresAt: number;
  scope?: string;
};

let cachedClientCredentialsToken: ClientCredentialsToken | null = null;

function usage(): never {
  console.error(
    [
      'Usage: pnpm seed:shopify -- [options]',
      '',
      '  --count <n>                  Total orders to create (default: 100)',
      '  --customers <n>              Distinct customers to create (default: min(count, 30))',
      '  --orders-per-customer <n>   Repeat history per customer; overrides count distribution',
      '  --pace-ms <n>               Delay between API writes (default: 350)',
      '  --order-pace-ms <n>         Delay between order writes (default: 12500)',
      '  --dry-run                   Generate and print the plan without API writes',
      '  --help',
    ].join('\n')
  );
  process.exit(2);
}

function positiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    count: 100,
    customers: 30,
    paceMs: 350,
    orderPaceMs: 12_500,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') usage();
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const [flag, inline] = arg.split('=', 2);
    const next = inline ?? argv[++i];
    if (next === undefined) throw new Error(`${flag} requires a value`);
    if (flag === '--count') options.count = positiveInt(next, flag);
    else if (flag === '--customers') options.customers = positiveInt(next, flag);
    else if (flag === '--orders-per-customer') options.ordersPerCustomer = positiveInt(next, flag);
    else if (flag === '--pace-ms') options.paceMs = positiveInt(next, flag);
    else if (flag === '--order-pace-ms') options.orderPaceMs = positiveInt(next, flag);
    else throw new Error(`Unknown option: ${arg}`);
  }

  options.customers = Math.min(options.customers, options.count);
  return options;
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  return at > 1 ? `${email.slice(0, 2)}***${email.slice(at)}` : '***';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function storeDomain(): string {
  const raw = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!raw) throw new Error('SHOPIFY_STORE_DOMAIN is required');
  return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
}

function legacyToken(): string | null {
  const raw = process.env.SHOPIFY_ADMIN_API_TOKEN?.trim();
  return raw || null;
}

function baseUrl(): string {
  return `https://${storeDomain()}/admin/api/${API_VERSION}`;
}

function clientId(): string | null {
  const raw = process.env.SHOPIFY_API_KEY?.trim();
  return raw || null;
}

function clientSecret(): string | null {
  const raw = process.env.SHOPIFY_API_SECRET?.trim();
  return raw || null;
}

async function accessToken(): Promise<string> {
  const id = clientId();
  const secret = clientSecret();

  // Prefer the Dev Dashboard client-credentials flow whenever both app
  // credentials are available. This avoids accidentally using a stale token
  // left in .env.local after an app version or permission update.
  if (id && secret) {
    const refreshSkewMs = 60_000;
    if (cachedClientCredentialsToken && cachedClientCredentialsToken.expiresAt > Date.now() + refreshSkewMs) {
      return cachedClientCredentialsToken.accessToken;
    }

    const response = await fetch(`https://${storeDomain()}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: id,
        client_secret: secret,
      }).toString(),
    });

    const raw = await response.text();
    let payload: { access_token?: unknown; expires_in?: unknown; scope?: unknown } = {};
    try {
      payload = raw ? (JSON.parse(raw) as typeof payload) : {};
    } catch {
      // Keep the bounded raw response below for non-JSON errors.
    }

    if (!response.ok) {
      const detail = raw.slice(0, 500);
      throw new Error(`Shopify client-credentials token request -> HTTP ${response.status}: ${detail}`);
    }

    const tokenValue = typeof payload.access_token === 'string' ? payload.access_token.trim() : '';
    if (!tokenValue) throw new Error('Shopify client-credentials response did not contain an access token');

    const expiresIn = typeof payload.expires_in === 'number' && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 86_400;
    cachedClientCredentialsToken = {
      accessToken: tokenValue,
      expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
      scope: typeof payload.scope === 'string' ? payload.scope : undefined,
    };
    console.log(`Shopify client-credentials token acquired (expires in ~${Math.round(expiresIn / 3600)}h).`);
    return tokenValue;
  }

  const fallback = legacyToken();
  if (fallback) return fallback;
  throw new Error(
    'Shopify credentials are missing. Set SHOPIFY_API_KEY + SHOPIFY_API_SECRET, or provide SHOPIFY_ADMIN_API_TOKEN.'
  );
}

async function shopifyRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  attempt = 0
): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      'X-Shopify-Access-Token': await accessToken(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();
  if (response.ok) return (raw ? JSON.parse(raw) : {}) as T;

  // Shopify uses 429 for leaky-bucket throttling. Retry only transient errors;
  // authentication, validation, and scope failures stop immediately.
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '0');
    const delay = Math.max(retryAfter * 1000, 500 * 2 ** attempt);
    await sleep(delay);
    return shopifyRequest<T>(method, path, body, attempt + 1);
  }

  let detail = raw.slice(0, 500);
  try {
    const parsed = JSON.parse(raw) as ShopifyError;
    detail = JSON.stringify(parsed.errors ?? parsed).slice(0, 500);
  } catch {
    // Keep the bounded raw response for non-JSON errors.
  }
  throw new Error(`Shopify ${method} ${path} -> HTTP ${response.status}: ${detail}`);
}

function profileFor(index: number): Profile {
  const cluster = Math.floor(index / 3) + 1;
  const variant = index % 3;
  const [firstName, lastName] = FIRST_NAMES[index % FIRST_NAMES.length];
  const [city, zip] = CITY_ZIPS[(cluster - 1) % CITY_ZIPS.length];
  const number = 100 + (cluster - 1) * 10;
  const street = STREET_FORMS[((cluster - 1) * 2 + variant) % STREET_FORMS.length];
  const address2 = variant === 0 ? `Apt ${100 + cluster}` : variant === 1 ? `#${100 + cluster}` : `Unit ${101 + cluster}`;
  const email =
    variant === 0
      ? `cluster${String(cluster).padStart(2, '0')}.${RUN_ID}.member@example.com`
      : variant === 1
        ? `cluster${String(cluster).padStart(2, '0')}.${RUN_ID}.member+gift@example.com`
        : `cluster${String(cluster).padStart(2, '0')}.${RUN_ID}.membr@example.co`;
  // Exact duplicate phone numbers are rejected by Shopify. Use formatting
  // variants and a one-digit drift to create near-match evidence instead.
  const phoneExchange = String(200 + ((PHONE_RUN_SEED + cluster * 17) % 800)).padStart(3, '0');
  const phoneDigits = String(1000 + ((PHONE_RUN_SEED + cluster * 31 + variant) % 9000)).padStart(4, '0');
  const phone =
    variant === 0
      ? `(202) ${phoneExchange}-${phoneDigits}`
      : variant === 1
        ? `+1 202-${phoneExchange}-${phoneDigits}`
        : `202${phoneExchange}${phoneDigits}`;

  const address: Address = {
    first_name: firstName,
    last_name: lastName,
    address1: `${number} ${street}`,
    address2,
    city,
    province: 'California',
    province_code: 'CA',
    zip,
    country: 'United States',
    country_code: 'US',
    phone,
  };
  return { cluster, variant, firstName, lastName, email, phone, address };
}

function orderPlan(options: Options): Array<{ profileIndex: number; sequence: number }> {
  const result: Array<{ profileIndex: number; sequence: number }> = [];
  if (options.ordersPerCustomer) {
    for (let customer = 0; customer < options.customers && result.length < options.count; customer += 1) {
      for (let sequence = 1; sequence <= options.ordersPerCustomer && result.length < options.count; sequence += 1) {
        result.push({ profileIndex: customer, sequence });
      }
    }
    return result;
  }

  // Round-robin creates an initial order for every identity before adding
  // repeat history, which makes cross-customer linkage harder than a single
  // customer receiving all orders first.
  for (let sequence = 1; result.length < options.count; sequence += 1) {
    for (let customer = 0; customer < options.customers && result.length < options.count; customer += 1) {
      result.push({ profileIndex: customer, sequence });
    }
  }
  return result;
}

async function preflight(): Promise<{ scopes: Set<string> }> {
  // Unlike versioned Admin REST resources, the OAuth scope introspection
  // endpoint lives directly under /admin/oauth.
  const response = await fetch(`https://${storeDomain()}/admin/oauth/access_scopes.json`, {
    headers: {
      'X-Shopify-Access-Token': await accessToken(),
      Accept: 'application/json',
    },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Shopify GET /admin/oauth/access_scopes.json -> HTTP ${response.status}: ${raw.slice(0, 500)}`);
  }
  let payload: { access_scopes?: Array<{ handle: string }> } = {};
  try {
    payload = raw ? (JSON.parse(raw) as typeof payload) : {};
  } catch {
    throw new Error('Shopify scope introspection returned invalid JSON');
  }
  const accessScopes = payload.access_scopes ?? [];
  const scopes = new Set((accessScopes ?? []).map((scope) => scope.handle));
  const missing = ['write_customers', 'write_orders'].filter((scope) => !scopes.has(scope));
  if (missing.length) {
    throw new Error(`Token is missing required Shopify scopes: ${missing.join(', ')}`);
  }
  return { scopes };
}

async function createCustomer(profile: Profile, options: Options): Promise<Customer> {
  const response = await shopifyRequest<{ customer: Customer }>('POST', '/customers.json', {
    customer: {
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      verified_email: true,
      addresses: [profile.address],
      tags: `${SEED_TAG},${RUN_TAG},identity-cluster-${String(profile.cluster).padStart(2, '0')},identity-variant-${profile.variant + 1}`,
    },
  });
  await sleep(options.paceMs);
  return response.customer;
}

async function createOrder(
  profile: Profile,
  customer: Customer,
  sequence: number,
  options: Options
): Promise<Order> {
  const [title, price] = PRODUCTS[(profile.cluster + profile.variant + sequence - 2) % PRODUCTS.length];
  const response = await shopifyRequest<{ order: Order }>('POST', '/orders.json', {
    order: {
      customer: { id: customer.id },
      email: profile.email,
      line_items: [{ title, price, quantity: sequence % 4 === 0 ? 2 : 1 }],
      financial_status: 'paid',
      inventory_behaviour: 'bypass',
      send_receipt: false,
      send_fulfillment_receipt: false,
      shipping_address: {
        ...profile.address,
        // A small order-level formatting change tests whether ingestion uses
        // the shipping snapshot without overwriting the customer identity.
        address1: sequence % 3 === 0 ? profile.address.address1.replace('Street', 'St') : profile.address.address1,
      },
      tags: `${SEED_TAG},${RUN_TAG},identity-cluster-${String(profile.cluster).padStart(2, '0')},order-sequence-${sequence}`,
      note: `Synthetic identity-resolution seed; run ${RUN_ID}; cluster ${profile.cluster}; variant ${profile.variant + 1}; sequence ${sequence}`,
    },
  });
  await sleep(options.orderPaceMs);
  return response.order;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const plan = orderPlan(options);
  const profiles = Array.from({ length: options.customers }, (_, index) => profileFor(index));

  console.log(
    JSON.stringify(
      {
        store: process.env.SHOPIFY_STORE_DOMAIN ?? '(unset)',
        apiVersion: API_VERSION,
        runId: RUN_ID,
        runTag: RUN_TAG,
        totalOrders: plan.length,
        distinctCustomers: profiles.length,
        paceMs: options.paceMs,
        orderPaceMs: options.orderPaceMs,
        dryRun: options.dryRun,
        identityDesign: '3 variants per cluster; shared address family; near-match names/emails/phones; varied line items',
      },
      null,
      2
    )
  );

  if (options.dryRun) {
    for (const profile of profiles.slice(0, Math.min(6, profiles.length))) {
      console.log(
        `plan cluster=${profile.cluster} variant=${profile.variant + 1} email=${maskEmail(profile.email)} ` +
          `address=${profile.address.address1} ${profile.address.address2} ${profile.address.city} ${profile.address.zip}`
      );
    }
    console.log('Dry run complete; no Shopify requests were made.');
    return;
  }

  await preflight();
  console.log('Shopify preflight passed: write_customers and write_orders are available.');

  const customers = new Map<number, Customer>();
  let completed = 0;
  for (const item of plan) {
    const profile = profiles[item.profileIndex];
    let customer = customers.get(item.profileIndex);
    if (!customer) {
      customer = await createCustomer(profile, options);
      customers.set(item.profileIndex, customer);
      console.log(
        `customer ${customers.size}/${profiles.length} id=${customer.id} email=${maskEmail(profile.email)} ` +
          `cluster=${profile.cluster} variant=${profile.variant + 1}`
      );
    }

    const order = await createOrder(profile, customer, item.sequence, options);
    completed += 1;
    console.log(
      `order ${completed}/${plan.length} ${order.name} customer=${customer.id} ` +
        `cluster=${profile.cluster} variant=${profile.variant + 1} sequence=${item.sequence}`
    );
  }

  console.log(`Seed complete: ${completed} paid orders across ${customers.size} synthetic customers.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
