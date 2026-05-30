export const ACTIVE_CLAIM_STATUSES = ['open', 'under_review', 'evidence_requested', 'pending', 'escalated'] as const;
export const FINAL_CLAIM_STATUSES = ['resolved', 'closed'] as const;
export const CLAIM_STATUSES = [...ACTIVE_CLAIM_STATUSES, ...FINAL_CLAIM_STATUSES] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type SlaState = 'normal' | 'approaching' | 'overdue' | 'resolved';

export type ClaimAgeInput = {
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function isActiveClaimStatus(status: string | null | undefined): boolean {
  return (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(status ?? '');
}

export function isFinalClaimStatus(status: string | null | undefined): boolean {
  return (FINAL_CLAIM_STATUSES as readonly string[]).includes(status ?? '');
}

export function claimOpenedAt(claim: ClaimAgeInput): Date | null {
  const value = claim.submitted_at ?? claim.created_at ?? claim.updated_at ?? null;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function claimAgeMs(claim: ClaimAgeInput, now = new Date()): number | null {
  const openedAt = claimOpenedAt(claim);
  if (!openedAt) return null;
  return Math.max(0, now.getTime() - openedAt.getTime());
}

export function formatClaimAge(claim: ClaimAgeInput, now = new Date()): string {
  const age = claimAgeMs(claim, now);
  if (age === null) return 'Age unavailable';
  const days = Math.floor(age / DAY_MS);
  const hours = Math.floor(age / HOUR_MS);
  const ageLabel = days >= 1
    ? `${days} ${days === 1 ? 'day' : 'days'}`
    : `${Math.max(0, hours)} ${hours === 1 ? 'hour' : 'hours'}`;
  if (isFinalClaimStatus(claim.status)) return `Resolved in ${ageLabel}`;
  return `${ageLabel} open`;
}

export function getClaimSlaState(claim: ClaimAgeInput, now = new Date()): {
  state: SlaState;
  label: string;
  detail: string;
} {
  if (isFinalClaimStatus(claim.status)) {
    return { state: 'resolved', label: 'Resolved', detail: formatClaimAge(claim, now) };
  }

  const age = claimAgeMs(claim, now);
  if (age === null) return { state: 'normal', label: 'SLA unknown', detail: 'Filed date unavailable' };

  const hours = age / HOUR_MS;
  if (hours > 72) return { state: 'overdue', label: 'Overdue', detail: formatClaimAge(claim, now) };
  if (hours >= 48) return { state: 'approaching', label: 'Approaching SLA', detail: formatClaimAge(claim, now) };
  return { state: 'normal', label: 'Normal', detail: formatClaimAge(claim, now) };
}

export function formatFiledDate(claim: ClaimAgeInput): string {
  const openedAt = claimOpenedAt(claim);
  if (!openedAt) return '—';
  return openedAt.toLocaleDateString('en-US');
}
