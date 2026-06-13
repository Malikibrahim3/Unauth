import { ACTIVE_CLAIM_STATUSES, FINAL_CLAIM_STATUSES, getClaimSlaState, type ClaimAgeInput } from './sla';

export type ClaimQueueCountRow = ClaimAgeInput & {
  status: string;
  first_viewed_at?: string | null;
  assigned_to?: string | null;
  snoozed_until?: string | null;
};

export type ClaimQueueCounts = {
  total: number;
  active: number;
  unread: number;
  assignedToMe: number;
  unassigned: number;
  overdue: number;
  awaitingEvidence: number;
  awaitingInfo: number;
  snoozed: number;
  escalated: number;
  resolved: number;
  open: number;
  underReview: number;
};

export function isClaimSnoozed(claim: ClaimQueueCountRow, now = new Date()): boolean {
  if (!(ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status)) return false;
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  return !!snoozedUntil && snoozedUntil.getTime() > now.getTime();
}

export function isClaimInActiveQueue(claim: ClaimQueueCountRow, now = new Date()): boolean {
  if (!(ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status)) return false;
  return !isClaimSnoozed(claim, now);
}

export function isUnreadActiveClaim(claim: ClaimQueueCountRow, now = new Date()): boolean {
  return isClaimInActiveQueue(claim, now) && !claim.first_viewed_at;
}

export function isClaimInHistory(claim: ClaimQueueCountRow): boolean {
  return (FINAL_CLAIM_STATUSES as readonly string[]).includes(claim.status);
}

export function isClaimAssignedTo(claim: ClaimQueueCountRow, userId: string): boolean {
  return isClaimInActiveQueue(claim) && claim.assigned_to === userId;
}

export function isClaimUnassignedActive(claim: ClaimQueueCountRow, now = new Date()): boolean {
  return isClaimInActiveQueue(claim, now) && !claim.assigned_to;
}

export function isClaimOverdueActive(claim: ClaimQueueCountRow, now = new Date()): boolean {
  return isClaimInActiveQueue(claim, now) && getClaimSlaState(claim, now).state === 'overdue';
}

export function computeClaimQueueCounts(
  rows: ClaimQueueCountRow[],
  currentUserId?: string | null,
  now = new Date(),
): ClaimQueueCounts {
  const counts: ClaimQueueCounts = {
    total: rows.length,
    active: 0,
    unread: 0,
    assignedToMe: 0,
    unassigned: 0,
    overdue: 0,
    awaitingEvidence: 0,
    awaitingInfo: 0,
    snoozed: 0,
    escalated: 0,
    resolved: 0,
    open: 0,
    underReview: 0,
  };

  for (const row of rows) {
    if (isClaimInHistory(row)) {
      counts.resolved += 1;
      continue;
    }
    if (isClaimSnoozed(row, now)) {
      counts.snoozed += 1;
      continue;
    }
    if (!isClaimInActiveQueue(row, now)) continue;

    counts.active += 1;
    if (!row.first_viewed_at) counts.unread += 1;
    if (!row.assigned_to) counts.unassigned += 1;
    if (currentUserId && row.assigned_to === currentUserId) counts.assignedToMe += 1;
    if (getClaimSlaState(row, now).state === 'overdue') counts.overdue += 1;
    if (row.status === 'evidence_requested') counts.awaitingEvidence += 1;
    if (row.status === 'pending') counts.awaitingInfo += 1;
    if (row.status === 'escalated') counts.escalated += 1;
    if (row.status === 'open') counts.open += 1;
    if (row.status === 'under_review') counts.underReview += 1;
  }

  return counts;
}

/** @deprecated Use computeClaimQueueCounts */
export function countClaimsFromRows(rows: ClaimQueueCountRow[], now = new Date()) {
  const counts = computeClaimQueueCounts(rows, null, now);
  return { active: counts.active, unread: counts.unread, overdue: counts.overdue };
}

function activeClaimsCountQuery(serviceClient: any, merchantId: string, nowIso: string) {
  return serviceClient
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .in('status', [...ACTIVE_CLAIM_STATUSES])
    .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);
}

function snoozedClaimsCountQuery(serviceClient: any, merchantId: string, nowIso: string) {
  return serviceClient
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .in('status', [...ACTIVE_CLAIM_STATUSES])
    .not('snoozed_until', 'is', null)
    .gt('snoozed_until', nowIso);
}

export async function fetchClaimQueueCounts(
  serviceClient: any,
  merchantId: string,
  currentUserId?: string | null,
): Promise<ClaimQueueCounts> {
  const nowIso = new Date().toISOString();

  const [
    totalRes,
    activeRes,
    unreadRes,
    unassignedRes,
    assignedRes,
    snoozedRes,
    resolvedRes,
    pendingRes,
    escalatedRes,
    openRes,
    slaRowsRes,
  ] = await Promise.all([
    serviceClient
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso).is('first_viewed_at', null),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso).is('assigned_to', null),
    currentUserId
      ? activeClaimsCountQuery(serviceClient, merchantId, nowIso).eq('assigned_to', currentUserId)
      : Promise.resolve({ count: 0 }),
    snoozedClaimsCountQuery(serviceClient, merchantId, nowIso),
    serviceClient
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .in('status', [...FINAL_CLAIM_STATUSES]),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso).eq('status', 'pending'),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso).eq('status', 'escalated'),
    activeClaimsCountQuery(serviceClient, merchantId, nowIso).eq('status', 'open'),
    serviceClient
      .from('claims')
      .select('status,submitted_at,created_at,updated_at,snoozed_until,first_viewed_at,assigned_to')
      .eq('merchant_id', merchantId)
      .in('status', [...ACTIVE_CLAIM_STATUSES]),
  ]);

  const overdue = ((slaRowsRes.data ?? []) as ClaimQueueCountRow[]).filter((row) =>
    isClaimOverdueActive(row),
  ).length;

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    unread: unreadRes.count ?? 0,
    unassigned: unassignedRes.count ?? 0,
    assignedToMe: assignedRes.count ?? 0,
    snoozed: snoozedRes.count ?? 0,
    resolved: resolvedRes.count ?? 0,
    // 'evidence_requested' / 'under_review' are not v2 claim_status values.
    awaitingEvidence: 0,
    awaitingInfo: pendingRes.count ?? 0,
    escalated: escalatedRes.count ?? 0,
    open: openRes.count ?? 0,
    underReview: 0,
    overdue,
  };
}
