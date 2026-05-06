import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

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
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

export function createServiceClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    }
  );
}

export function createAdminClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
