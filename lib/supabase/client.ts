import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

function makeMissingEnvStub(name: string) {
  return new Proxy({}, {
    get() {
      return () => Promise.resolve({ data: null, error: { message: `${name} not configured` } });
    },
  });
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return makeMissingEnvStub('Supabase (browser)') as any;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, key);
  }

  return browserClient;
}
