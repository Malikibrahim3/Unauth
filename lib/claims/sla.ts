import {
  ACTIVE_CANONICAL_CLAIM_STATUSES,
  CANONICAL_CLAIM_STATUSES,
  FINAL_CANONICAL_CLAIM_STATUSES,
  isCanonicalFinalClaimStatus,
  type CanonicalClaimStatus,
} from '@/lib/claims/statusMachine';
import { formatDateAbsolute } from '@/lib/utils/format';

// Compatibility names for queue/SLA consumers. The status machine owns the
// values; this module owns only age and SLA calculations.
export const ACTIVE_CLAIM_STATUSES = ACTIVE_CANONICAL_CLAIM_STATUSES;
export const FINAL_CLAIM_STATUSES = FINAL_CANONICAL_CLAIM_STATUSES;
export const CLAIM_STATUSES = CANONICAL_CLAIM_STATUSES;

export type ClaimStatus = CanonicalClaimStatus;
export type SlaState = 'normal' | 'approaching' | 'overdue' | 'resolved';

export type ClaimAgeInput = {
  status?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// §6.3 attention scale: raised from 72h/48h — carrier/3PL/supplier response
// times routinely run a week, so a 3-day threshold fired on nearly every row.
const OVERDUE_THRESHOLD_HOURS = 168;
const APPROACHING_THRESHOLD_HOURS = 120;

export function isActiveClaimStatus(status: string | null | undefined): boolean {
  return (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(status ?? '');
}

export function isFinalClaimStatus(status: string | null | undefined): boolean {
  return isCanonicalFinalClaimStatus(status);
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

  // §6.3 attention scale: a state firing on most visible rows may not use a
  // tinted fill. Claims routinely wait a week on a carrier/3PL/supplier
  // response, so the threshold is a week, not three days.
  const hours = age / HOUR_MS;
  if (hours > OVERDUE_THRESHOLD_HOURS) return { state: 'overdue', label: 'Overdue', detail: formatClaimAge(claim, now) };
  if (hours >= APPROACHING_THRESHOLD_HOURS) return { state: 'approaching', label: 'Approaching SLA', detail: formatClaimAge(claim, now) };
  return { state: 'normal', label: 'Normal', detail: formatClaimAge(claim, now) };
}

export function formatFiledDate(claim: ClaimAgeInput): string {
  const openedAt = claimOpenedAt(claim);
  if (!openedAt) return '—';
  return formatDateAbsolute(openedAt);
}
