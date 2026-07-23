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
  payout_decision_recorded: 'Payout decision recorded',
  payout_decision_reversed: 'Payout decision reversed',
  payout_outcome_recorded: 'Payout outcome recorded',
  payout_outcome_reversed: 'Payout outcome reversed',
  financial_entry_recorded: 'Financial entry recorded',
  financial_entry_reversed: 'Financial entry reversed',
  loss_attribution_corrected: 'Loss attribution corrected',
  loss_financial_state_changed: 'Loss financial state changed',
  recovery_created: 'Recovery created',
  recovery_status_changed: 'Recovery status changed',
  recovery_amount_corrected: 'Recovery amount corrected',
  identity_link_resolved: 'Identity link resolved',
  rule_version_created: 'Rule version created',
  rule_version_published: 'Rule version published',
  rule_version_retired: 'Rule version retired',
  workflow_version_changed: 'Workflow version changed',
  workflow_version_published: 'Workflow version published',
  workflow_version_retired: 'Workflow version retired',
  integration_connected: 'Integration connected',
  integration_disconnected: 'Integration disconnected',
  integration_status_changed: 'Integration status changed',
  evidence_export_issued: 'Evidence export issued',
  evidence_export_downloaded: 'Evidence export downloaded',
  permission_granted: 'Permission granted',
  permission_revoked: 'Permission revoked',
  api_key_created: 'API key created',
  api_key_revoked: 'API key revoked',
  team_member_invited: 'Team member invited',
  team_member_role_changed: 'Team member role changed',
  team_member_removed: 'Team member removed',
  connector_action_recorded: 'Connector action recorded',
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
  financial_entry: 'Financial entry',
  loss_case: 'Loss case',
  recovery_case: 'Recovery case',
  rule_version: 'Rule version',
  workflow_version: 'Workflow version',
  integration_connection: 'Integration connection',
  permission_grant: 'Permission grant',
  merchant_member: 'Team member',
  api_key: 'API key',
  evidence_export: 'Evidence export',
  connector_action: 'Connector action',
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
