/**
 * lib/auth/requestContext.ts
 *
 * Request-scoped, deduplicated auth for React Server Components.
 *
 * Before this existed, the shared (app) layout AND every page each ran the
 * full `auth.getUser()` → `resolveCallerContext()` chain independently
 * (~4-5 serialized Supabase round-trips per navigation). React `cache()`
 * memoizes these helpers per server request, so the layout and page share
 * one `getUser` call, one caller-context resolution, and one service client.
 *
 * These helpers are for RSC pages/layouts only. API route handlers keep
 * using `requirePermission` from `@/lib/permissions` (they run once per
 * request already and need the NextResponse denial shape).
 *
 * Unlike the old page-level `requirePermission` calls, the caller context
 * here is resolved WITH the active-merchant cookie — previously only the
 * layout passed it, so a multi-workspace user could see the layout for
 * workspace A wrapping page data for workspace B.
 */

import { cache } from 'react';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import {
  ACTIVE_MERCHANT_COOKIE,
  resolvePermissions,
  type CallerContext,
  type Permission,
} from '@/lib/permissions';

/** One service client per request. */
export const getRequestServiceClient = cache(() => createServiceClient());

/** One `auth.getUser()` round-trip per request. */
export const getRequestUser = cache(async (): Promise<User | null> => {
  const { data } = await createClient().auth.getUser();
  return data?.user ?? null;
});

/**
 * One caller-context resolution per request, honouring the active-merchant
 * cookie. Returns null for unauthenticated users or users with no merchant
 * affiliation (onboarding required).
 */
export const getRequestCallerContext = cache(
  async (): Promise<CallerContext | null> => {
    const user = await getRequestUser();
    if (!user) return null;
    const cookieStore = await cookies();
    return ensureMerchantContextForUser(
      getRequestServiceClient(),
      user,
      cookieStore.get(ACTIVE_MERCHANT_COOKIE)?.value,
    );
  },
);

/** One permission list shared by the shell and permission-aware route bodies. */
export const getRequestPermissions = cache(async (): Promise<Permission[]> => {
  const ctx = await getRequestCallerContext();
  if (!ctx) return [];
  return resolvePermissions(getRequestServiceClient(), ctx);
});

/**
 * Page-level permission guard. Returns the caller context when allowed,
 * null when unauthenticated / no merchant / denied — pages redirect on null.
 * Memoized per permission, so layout and page can guard independently
 * without repeating queries.
 */
export const requirePagePermission = cache(
  async (permission: Permission): Promise<CallerContext | null> => {
    const [ctx, permissions] = await Promise.all([
      getRequestCallerContext(),
      getRequestPermissions(),
    ]);
    if (!ctx) return null;
    return permissions.includes(permission) ? ctx : null;
  },
);
