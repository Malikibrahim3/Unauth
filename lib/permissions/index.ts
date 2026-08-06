/**
 * lib/permissions/index.ts
 *
 * Bank-grade RBAC for Unauth.
 *
 * - Defines every capability as a named Permission constant.
 * - Maps default permissions to each Role.
 * - resolveCallerContext() identifies a user's merchantId + role, whether
 *   they are the account owner OR an active team member.
 * - hasPermission() checks role defaults + delegated user_permission_grants.
 * - requirePermission() is the one-line guard used in every API route.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { TABLES } from '@/lib/supabase/tables';

// ---------------------------------------------------------------------------
// Permissions – every granular capability in the system
// ---------------------------------------------------------------------------
export const PERMISSIONS = {
  // ── Read / view ──────────────────────────────────────────────────────────
  VIEW_DASHBOARD:         'view_dashboard',
  VIEW_AUDIT:             'view_audit',
  VIEW_CUSTOMERS:         'view_customers',
  VIEW_LOOKUP:            'view_lookup',
  VIEW_WATCHLIST:         'view_watchlist',
  VIEW_CHARGEBACKS:       'view_chargebacks',
  VIEW_INBOX:             'view_inbox',
  VIEW_SAVED:             'view_saved',
  VIEW_TEAM:              'view_team',
  VIEW_SETTINGS:          'view_settings',
  VIEW_AUDIT_TRAIL:       'view_audit_trail',   // ← owner/admin only by default
  MANAGE_WORK_VIEWS:      'manage_work_views',

  // ── Data actions ─────────────────────────────────────────────────────────
  EXPORT_AUDIT:           'export_audit',
  LOOKUP_CUSTOMER:        'lookup_customer',
  UPDATE_CUSTOMER_STATUS: 'update_customer_status',
  ADD_CUSTOMER_NOTE:      'add_customer_note',
  DELETE_CUSTOMER_NOTE:   'delete_customer_note',
  MANAGE_WATCHLIST:       'manage_watchlist',
  GENERATE_EVIDENCE:      'generate_evidence',
  SUBMIT_FRAUD_FEEDBACK:  'submit_fraud_feedback',
  SUBMIT_PAYOUT_DECISIONS: 'submit_payout_decisions', // review/decide/record on support payout cases
  DISMISS_TRANSACTION:    'dismiss_transaction',
  HIDE_JOB:               'hide_job',

  // ── Admin / privileged ───────────────────────────────────────────────────
  BULK_DELETE:            'bulk_delete',
  MANAGE_TEAM:            'manage_team',
  MANAGE_SETTINGS:        'manage_settings',
  GRANT_PERMISSIONS:      'grant_permissions',  // only owner
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type Role = 'owner' | 'admin' | 'analyst' | 'viewer';

// ---------------------------------------------------------------------------
// Default permission sets per role
// ---------------------------------------------------------------------------

const VIEWER_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.VIEW_AUDIT,
  PERMISSIONS.VIEW_CUSTOMERS,
  PERMISSIONS.VIEW_LOOKUP,
  PERMISSIONS.VIEW_WATCHLIST,
  PERMISSIONS.VIEW_CHARGEBACKS,
  PERMISSIONS.VIEW_INBOX,
  PERMISSIONS.VIEW_SAVED,
  PERMISSIONS.LOOKUP_CUSTOMER,
];

const ANALYST_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  PERMISSIONS.UPDATE_CUSTOMER_STATUS,
  PERMISSIONS.ADD_CUSTOMER_NOTE,
  PERMISSIONS.MANAGE_WATCHLIST,
  PERMISSIONS.GENERATE_EVIDENCE,
  PERMISSIONS.SUBMIT_FRAUD_FEEDBACK,
  PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  PERMISSIONS.DISMISS_TRANSACTION,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...ANALYST_PERMISSIONS,
  PERMISSIONS.VIEW_TEAM,
  PERMISSIONS.VIEW_SETTINGS,
  PERMISSIONS.VIEW_AUDIT_TRAIL,
  PERMISSIONS.EXPORT_AUDIT,
  PERMISSIONS.DELETE_CUSTOMER_NOTE,
  PERMISSIONS.HIDE_JOB,
  PERMISSIONS.BULK_DELETE,
  PERMISSIONS.MANAGE_TEAM,
  PERMISSIONS.MANAGE_SETTINGS,
  PERMISSIONS.MANAGE_WORK_VIEWS,
];

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.GRANT_PERMISSIONS,
];

export const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  viewer:  new Set(VIEWER_PERMISSIONS),
  analyst: new Set(ANALYST_PERMISSIONS),
  admin:   new Set(ADMIN_PERMISSIONS),
  owner:   new Set(OWNER_PERMISSIONS),
};

// Human-readable labels for UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  view_dashboard:          'View Dashboard',
  view_audit:              'View Audit Results',
  view_customers:          'View Customer Profiles',
  view_lookup:             'View Lookup Page',
  view_watchlist:          'View Legacy Customer Context',
  view_chargebacks:        'View Evidence Packages',
  view_inbox:              'View Inbox / Alerts',
  view_saved:              'View Saved Reports',
  view_team:               'View Team Members',
  view_settings:           'View Settings',
  view_audit_trail:        'View Audit Trail',
  export_audit:            'Export Audit Reports',
  lookup_customer:         'Customer Lookup',
  update_customer_status:  'Update Investigation Status',
  add_customer_note:       'Add Customer Notes',
  delete_customer_note:    'Delete Customer Notes',
  manage_watchlist:        'Manage Legacy Saved Cases',
  generate_evidence:       'Generate Evidence Packages',
  submit_fraud_feedback:   'Submit Claim Feedback',
  submit_payout_decisions: 'Review & Decide Payout Cases',
  dismiss_transaction:     'Dismiss matched transactions',
  hide_job:                'Hide Upload Jobs',
  bulk_delete:             'Bulk Delete Data',
  manage_team:             'Manage Team Members',
  manage_settings:         'Manage Account Settings',
  grant_permissions:       'Grant / Revoke Permissions',
  manage_work_views:       'Manage shared Work views',
};

// Permissions that can be delegated (owners can give these to lower-role users)
// GRANT_PERMISSIONS cannot be delegated — only the owner holds it.
export const DELEGATABLE_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).filter(
  (p) => p !== PERMISSIONS.GRANT_PERMISSIONS
) as Permission[];

// ---------------------------------------------------------------------------
// Caller context
// ---------------------------------------------------------------------------
export interface CallerContext {
  userId:     string;
  merchantId: string;
  role:       Role;
  memberId:   string | null; // null for account owner
}

async function logDeniedPermission(
  serviceClient: SupabaseClient,
  ctx: CallerContext,
  permission: Permission,
): Promise<void> {
  try {
    await serviceClient.from(TABLES.ACCESS_AUDIT_LOG).insert({
      merchant_id: ctx.merchantId,
      identity_id: null,
      query_type: 'permission_denied',
      lookup_type: permission,
      k_anonymity_satisfied: false,
      result_returned: false,
      queried_hashes: [],
      matched_merchant_count: 0,
      request_ip: null,
    });
  } catch {
    // Authorization must still fail closed if the audit projection is unavailable.
  }
}

/**
 * Resolves the merchant + role for a user.
 * Checks merchant ownership first, then active team membership.
 * Always uses the service client to bypass RLS.
 *
 * If the user is authenticated but has no merchant affiliation at all
 * (e.g. they skipped or bounced out of onboarding), we auto-bootstrap a
 * minimal merchant row for them so the rest of the app works. Onboarding
 * can still upgrade the row later (name, platform, etc.).
 */
export async function resolveCallerContext(
  serviceClient: SupabaseClient,
  userId: string,
  selectedMerchantId?: string | null,
): Promise<CallerContext | null> {
  let preferredMerchantId = selectedMerchantId ?? null;
  if (!preferredMerchantId) {
    try {
      const { data } = await serviceClient.auth.admin.getUserById(userId);
      preferredMerchantId = typeof data.user?.user_metadata?.active_merchant_id === 'string'
        ? data.user.user_metadata.active_merchant_id
        : null;
    } catch {
      // Test doubles and restricted clients may not expose the admin auth API.
    }
  }
  // v2 tenancy: ownership IS membership. merchant_users holds every
  // affiliation; a row with role='owner' is the account owner (the old
  // merchants.user_id column was dropped at the v2 cutover). memberId stays
  // null for owners so isAccountOwner checks keep working.
  const toCtx = (row: { id: string; merchant_id: string; role: string }): CallerContext => {
    const role = row.role as Role;
    return {
      userId,
      merchantId: row.merchant_id,
      role,
      memberId: role === 'owner' ? null : row.id,
    };
  };

  // 1. Active memberships (prefer the highest-privilege row if the user
  //    belongs to several merchants).
  const { data: active } = await serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select('id, merchant_id, role')
    .eq('user_id', userId)
    .eq('invite_status', 'active');

  if (active && active.length > 0) {
    if (preferredMerchantId) {
      const selected = active.find((membership) => membership.merchant_id === preferredMerchantId);
      return selected ? toCtx(selected) : null;
    }
    // A single affiliation is unambiguous. Multiple affiliations require an
    // explicit cookie/auth-metadata selection; choosing by role or row order
    // could silently run a request in the wrong merchant workspace.
    return active.length === 1 ? toCtx(active[0]) : null;
  }

  // 2. Did the user just accept a magic-link team invite? Auto-activate it.
  const { data: pendingMember } = await serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select('id, merchant_id, role')
    .eq('user_id', userId)
    .eq('invite_status', 'pending')
    .maybeSingle();

  if (pendingMember) {
    await serviceClient
      .from(TABLES.MERCHANT_MEMBERS)
      .update({
        invite_status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', pendingMember.id);

    return toCtx(pendingMember);
  }

  // 3. No membership — onboarding is required.
  return null;
}

/** Cookie used by the authenticated shell to persist an explicitly selected membership. */
export const ACTIVE_MERCHANT_COOKIE = 'unauth.active_merchant';

/**
 * Checks whether a caller has a specific permission.
 * Checks base role grants first; if not found, checks delegated grants.
 */
export async function hasPermission(
  serviceClient: SupabaseClient,
  ctx: CallerContext,
  permission: Permission
): Promise<boolean> {
  // 1. Role default
  if (ROLE_PERMISSIONS[ctx.role]?.has(permission)) return true;

  // 2. Explicit delegated grant for this user + permission
  const { data: grant } = await serviceClient
    .from('user_permission_grants')
    .select('id')
    .eq('merchant_id', ctx.merchantId)
    .eq('grantee_user_id', ctx.userId)
    .eq('permission', permission)
    .eq('revoked', false)
    .maybeSingle();

  return !!grant;
}

/**
 * Resolves the complete permission set for an already-authorised caller in a
 * single delegated-grant query. The authenticated shell needs every
 * permission to build navigation and the command palette; calling
 * hasPermission once per capability turns one render into an avoidable query
 * fan-out for viewer and delegated roles.
 */
export async function resolvePermissions(
  serviceClient: SupabaseClient,
  ctx: CallerContext,
): Promise<Permission[]> {
  const orderedPermissions = Object.values(PERMISSIONS) as Permission[];
  const resolved = new Set(ROLE_PERMISSIONS[ctx.role] ?? []);

  // Owners already receive every current permission through their role.
  if (resolved.size === orderedPermissions.length) return orderedPermissions;

  const { data: grants } = await serviceClient
    .from('user_permission_grants')
    .select('permission')
    .eq('merchant_id', ctx.merchantId)
    .eq('grantee_user_id', ctx.userId)
    .eq('revoked', false);

  const knownPermissions = new Set<Permission>(orderedPermissions);
  for (const row of (grants ?? []) as Array<{ permission: string }>) {
    if (knownPermissions.has(row.permission as Permission)) {
      resolved.add(row.permission as Permission);
    }
  }

  return orderedPermissions.filter((permission) => resolved.has(permission));
}

const DEFAULT_APP_DESTINATIONS: Array<{ permission: Permission; href: string }> = [
  { permission: PERMISSIONS.VIEW_DASHBOARD, href: '/overview' },
  { permission: PERMISSIONS.VIEW_INBOX, href: '/cases' },
  { permission: PERMISSIONS.VIEW_CUSTOMERS, href: '/customers' },
  { permission: PERMISSIONS.VIEW_SETTINGS, href: '/settings/workspace/account' },
];

/**
 * Finds the best safe in-app destination for users who hit a page they cannot
 * access. This avoids chaining denied pages through /dashboard and accidentally
 * dumping every click into the New Audit upload flow.
 */
export async function resolveDefaultAppPath(
  serviceClient: SupabaseClient,
  userId: string,
  options: { exclude?: string[] } = {},
): Promise<string> {
  const ctx = await resolveCallerContext(serviceClient, userId);
  if (!ctx) return '/onboarding';

  const excluded = new Set(options.exclude ?? []);
  const resolveDestination = async (index: number): Promise<string | null> => {
    if (index >= DEFAULT_APP_DESTINATIONS.length) return null;
    const destination = DEFAULT_APP_DESTINATIONS[index]!;
    if (excluded.has(destination.href)) {
      return resolveDestination(index + 1);
    }
    if (await hasPermission(serviceClient, ctx, destination.permission)) {
      return destination.href;
    }
    return resolveDestination(index + 1);
  };
  const resolved = await resolveDestination(0);
  if (resolved) return resolved;

  return '/onboarding';
}

/**
 * One-liner guard for API routes.
 *
 * Usage:
 *   const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.EXPORT_AUDIT);
 *   if (denied) return denied;
 *   // ctx.merchantId is now available and correct for both owner + team members
 */
export async function requirePermission(
  serviceClient: SupabaseClient,
  userId: string,
  permission: Permission
): Promise<{ denied: NextResponse; ctx: null } | { denied: null; ctx: CallerContext }> {
  const ctx = await resolveCallerContext(serviceClient, userId);

  if (!ctx) {
    return {
      denied: NextResponse.json(
        { error: 'Forbidden — no merchant affiliation found.' },
        { status: 403 }
      ),
      ctx: null,
    };
  }

  const allowed = await hasPermission(serviceClient, ctx, permission);

  if (!allowed) {
    await logDeniedPermission(serviceClient, ctx, permission);
    return {
      denied: NextResponse.json(
        { error: `Forbidden — you do not have the '${permission}' permission.` },
        { status: 403 }
      ),
      ctx: null,
    };
  }

  return { denied: null, ctx };
}

/**
 * Authorizes an exact merchant selected before an external callback. This must
 * be used whenever a merchant identifier comes from protected server state;
 * falling back to the caller's highest-role/default workspace could attach a
 * provider account to the wrong tenant.
 */
export async function requirePermissionForMerchant(
  serviceClient: SupabaseClient,
  userId: string,
  merchantId: string,
  permission: Permission,
): Promise<{ denied: NextResponse; ctx: null } | { denied: null; ctx: CallerContext }> {
  const ctx = await resolveCallerContext(serviceClient, userId, merchantId);

  if (!ctx || ctx.merchantId !== merchantId) {
    return {
      denied: NextResponse.json(
        { error: 'Forbidden — the selected merchant affiliation is not active.' },
        { status: 403 },
      ),
      ctx: null,
    };
  }

  if (!(await hasPermission(serviceClient, ctx, permission))) {
    await logDeniedPermission(serviceClient, ctx, permission);
    return {
      denied: NextResponse.json(
        { error: `Forbidden — you do not have the '${permission}' permission.` },
        { status: 403 },
      ),
      ctx: null,
    };
  }

  return { denied: null, ctx };
}
