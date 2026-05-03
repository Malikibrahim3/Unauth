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
  VIEW_HISTORY:           'view_history',
  VIEW_INBOX:             'view_inbox',
  VIEW_SAVED:             'view_saved',
  VIEW_TEAM:              'view_team',
  VIEW_SETTINGS:          'view_settings',
  VIEW_AUDIT_TRAIL:       'view_audit_trail',   // ← owner/admin only by default

  // ── Data actions ─────────────────────────────────────────────────────────
  UPLOAD_CSV:             'upload_csv',
  EXPORT_AUDIT:           'export_audit',
  LOOKUP_CUSTOMER:        'lookup_customer',
  UPDATE_CUSTOMER_STATUS: 'update_customer_status',
  ADD_CUSTOMER_NOTE:      'add_customer_note',
  DELETE_CUSTOMER_NOTE:   'delete_customer_note',
  MANAGE_WATCHLIST:       'manage_watchlist',
  GENERATE_EVIDENCE:      'generate_evidence',
  SUBMIT_FRAUD_FEEDBACK:  'submit_fraud_feedback',
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
  PERMISSIONS.VIEW_HISTORY,
  PERMISSIONS.VIEW_INBOX,
  PERMISSIONS.VIEW_SAVED,
  PERMISSIONS.VIEW_TEAM,
  PERMISSIONS.VIEW_SETTINGS,
  PERMISSIONS.EXPORT_AUDIT,
  PERMISSIONS.LOOKUP_CUSTOMER,
];

const ANALYST_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  PERMISSIONS.UPLOAD_CSV,
  PERMISSIONS.UPDATE_CUSTOMER_STATUS,
  PERMISSIONS.ADD_CUSTOMER_NOTE,
  PERMISSIONS.MANAGE_WATCHLIST,
  PERMISSIONS.GENERATE_EVIDENCE,
  PERMISSIONS.SUBMIT_FRAUD_FEEDBACK,
  PERMISSIONS.DISMISS_TRANSACTION,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...ANALYST_PERMISSIONS,
  PERMISSIONS.VIEW_AUDIT_TRAIL,
  PERMISSIONS.DELETE_CUSTOMER_NOTE,
  PERMISSIONS.HIDE_JOB,
  PERMISSIONS.BULK_DELETE,
  PERMISSIONS.MANAGE_TEAM,
  PERMISSIONS.MANAGE_SETTINGS,
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
  view_watchlist:          'View Watchlist',
  view_chargebacks:        'View Chargebacks',
  view_history:            'View Upload History',
  view_inbox:              'View Inbox / Alerts',
  view_saved:              'View Saved Reports',
  view_team:               'View Team Members',
  view_settings:           'View Settings',
  view_audit_trail:        'View Audit Trail',
  upload_csv:              'Upload CSV / Run Audit',
  export_audit:            'Export Audit Reports',
  lookup_customer:         'Customer Lookup',
  update_customer_status:  'Update Investigation Status',
  add_customer_note:       'Add Customer Notes',
  delete_customer_note:    'Delete Customer Notes',
  manage_watchlist:        'Manage Watchlist',
  generate_evidence:       'Generate Evidence Packages',
  submit_fraud_feedback:   'Submit Fraud Feedback',
  dismiss_transaction:     'Dismiss Flagged Transactions',
  hide_job:                'Hide Upload Jobs',
  bulk_delete:             'Bulk Delete Data',
  manage_team:             'Manage Team Members',
  manage_settings:         'Manage Account Settings',
  grant_permissions:       'Grant / Revoke Permissions',
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
  userId: string
): Promise<CallerContext | null> {
  // 1. Is the user the merchant owner?
  const { data: ownerMerchant } = await serviceClient
    .from('merchants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (ownerMerchant) {
    return { userId, merchantId: ownerMerchant.id, role: 'owner', memberId: null };
  }

  // 2. Is the user an active team member?
  const { data: member } = await serviceClient
    .from('merchant_members')
    .select('id, merchant_id, role')
    .eq('user_id', userId)
    .eq('invite_status', 'active')
    .maybeSingle();

  if (member) {
    return {
      userId,
      merchantId: member.merchant_id as string,
      role: member.role as Role,
      memberId: member.id as string,
    };
  }

  // 3. No merchant + no team membership — auto-bootstrap a default merchant
  //    so the user can use the app. They land as 'owner'.
  const { data: created, error: createErr } = await serviceClient
    .from('merchants')
    .insert({ user_id: userId, name: 'My Store', setup_complete: false })
    .select('id')
    .single();

  if (createErr || !created) {
    // Last-ditch: maybe a race created one between SELECT and INSERT.
    const { data: retry } = await serviceClient
      .from('merchants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (retry) {
      return { userId, merchantId: retry.id, role: 'owner', memberId: null };
    }
    return null;
  }

  return { userId, merchantId: created.id, role: 'owner', memberId: null };
}

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
 * One-liner guard for API routes.
 *
 * Usage:
 *   const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
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
