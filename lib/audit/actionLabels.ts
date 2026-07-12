import { claimEventLabel } from '@/lib/claims/events';
import { PERMISSION_LABELS, type Permission } from '@/lib/permissions';

const ACTION_LABELS: Record<string, string> = {
  upload_csv: 'CSV uploaded',
  export_audit: 'Report exported',
  lookup_customer: 'Customer lookup performed',
  quick_score: 'Quick score run',
  view_customer: 'Customer profile viewed',
  update_customer_status: 'Review status updated',
  add_customer_note: 'Customer note added',
  delete_customer_note: 'Customer note deleted',
  add_to_watchlist: 'Added to watchlist',
  remove_from_watchlist: 'Removed from watchlist',
  generate_evidence: 'Evidence package generated',
  submit_fraud_feedback: 'Claim feedback submitted',
  dismiss_transaction: 'Transaction dismissed',
  hide_job: 'Audit run hidden',
  bulk_delete: 'Bulk data deletion',
  invite_team_member: 'Team member invited',
  update_team_member_role: 'Team role updated',
  remove_team_member: 'Team member removed',
  grant_permission: 'Permission granted',
  revoke_permission: 'Permission revoked',
  update_settings: 'Settings updated',
  view_audit_trail: 'Audit trail viewed',
};

const RESOURCE_LABELS: Record<string, string> = {
  claim: 'Claim',
  customer: 'Customer',
  processing_job: 'Audit run',
  audit_log: 'Audit log',
  report: 'Report',
  evidence: 'Evidence package',
  settings: 'Settings',
  system: 'System',
};

/** Human-readable label for an audit-trail action row. */
export function auditActionLabel(action: string, resourceType?: string | null): string {
  if (resourceType === 'claim') {
    return claimEventLabel(action);
  }
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const permissionLabel = PERMISSION_LABELS[action as Permission];
  if (permissionLabel) return permissionLabel;
  return action.replace(/_/g, ' ');
}

export function auditResourceLabel(resourceType: string | null | undefined): string {
  if (!resourceType) return 'System';
  return RESOURCE_LABELS[resourceType] ?? resourceType.replace(/_/g, ' ');
}

export function auditResourceSummary(
  resourceType: string | null | undefined,
  resourceId: string | null | undefined,
): string {
  const label = auditResourceLabel(resourceType);
  if (!resourceId) return label;
  const shortId = resourceId.length > 8 ? resourceId.slice(0, 8) : resourceId;
  return `${label} · ${shortId}`;
}
