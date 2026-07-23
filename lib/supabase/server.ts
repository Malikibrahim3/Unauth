import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import type { Database } from './types';
import { env } from '@/lib/utils/env';

type ServiceAuditContext = {
  actorId: string;
  actorRole: string;
  requestIp?: string;
  correlationId?: string;
};

type ServiceClientOptions = {
  /**
   * Trusted server-derived context copied into PostgREST request headers.
   * Sensitive-table triggers consume it in the same transaction as the row
   * mutation, so actor attribution does not require a second audit write.
   */
  audit?: ServiceAuditContext;
};

function auditHeaders(options: ServiceClientOptions): Record<string, string> {
  const audit = options.audit;
  if (!audit) return {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(audit.actorId)) {
    throw new Error('Invalid audited service actor id');
  }
  return {
    'x-unauth-audit-actor-id': audit.actorId,
    'x-unauth-audit-actor-role': audit.actorRole.slice(0, 64),
    'x-unauth-audit-correlation-id': audit.correlationId ?? randomUUID(),
    ...(audit.requestIp ? { 'x-unauth-audit-request-ip': audit.requestIp.slice(0, 128) } : {}),
  };
}

function makeMissingEnvStub(name: string): any {
  const message = `${name} not configured`;
  const handler: ProxyHandler<any> = {
    get(_target, _prop) {
      // return a callable proxy which itself returns error-shaped responses when invoked
      const fn = () => Promise.resolve({ data: null, error: { message } });
      return new Proxy(fn, {
        apply() { return Promise.resolve({ data: null, error: { message } }); },
        get() { return fn; },
      });
    },
    apply() { return Promise.resolve({ data: null, error: { message } }); },
  };

  return new Proxy(() => Promise.resolve({ data: null, error: { message } }), handler as any);
}

export function createClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a safe stub so static builds / prerendering won't crash.
    return makeMissingEnvStub('Supabase (client)');
  }

  const cookieStorePromise = cookies();

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options?: any) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.set(name, value, options);
          } catch {
          }
        },
        async remove(name: string, _options?: any) {
          try {
            const cookieStore = await cookieStorePromise;
            cookieStore.delete(name);
          } catch {
          }
        },
      },
    }
  );
}

export function createServiceClient(options: ServiceClientOptions = {}): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return makeMissingEnvStub('Supabase (service)');
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: auditHeaders(options),
      },
    }
  );
}

export function createAdminClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return makeMissingEnvStub('Supabase (admin)');
  }

  return createSupabaseClient<Database>(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
