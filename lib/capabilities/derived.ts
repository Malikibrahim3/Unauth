/**
 * Pure, source-backed capability derivations used by existing route read
 * models. These functions deliberately return an unavailable state when the
 * source does not contain enough evidence; callers must not turn null into a
 * confident zero.
 */

const DAY_MS = 86_400_000;

export type Availability = 'available' | 'unavailable';

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfUtcWeek(value: Date): Date {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  const distanceFromMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - distanceFromMonday);
  return date;
}

export type DurationDerivation = {
  durationMs: number | null;
  state: 'completed' | 'live' | 'unavailable';
  startedAt: string | null;
  completedAt: string | null;
};

export function deriveDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
  now = new Date(),
): DurationDerivation {
  const startedMs = timestamp(startedAt);
  const completedMs = timestamp(completedAt);
  if (startedMs == null) {
    return { durationMs: null, state: 'unavailable', startedAt: startedAt ?? null, completedAt: completedAt ?? null };
  }
  if (completedMs != null && completedMs >= startedMs) {
    return { durationMs: completedMs - startedMs, state: 'completed', startedAt: startedAt!, completedAt: completedAt! };
  }
  const nowMs = now.getTime();
  if (Number.isFinite(nowMs) && nowMs >= startedMs) {
    return { durationMs: nowMs - startedMs, state: 'live', startedAt: startedAt!, completedAt: completedAt ?? null };
  }
  return { durationMs: null, state: 'unavailable', startedAt: startedAt!, completedAt: completedAt ?? null };
}

export type HoldRatePoint = {
  weekStart: string;
  heldRows: number | null;
  totalRows: number | null;
  percentage: number | null;
  sampleCount: number;
  state: Availability;
};

type ImportObservation = {
  created_at?: string | null;
  total_rows?: number | null;
  failed_rows?: number | null;
};

/** Build the nine-week hold-rate series from retained import observations. */
export function buildHoldRateTimeseries(
  rows: ImportObservation[],
  now = new Date(),
  weeks = 9,
): HoldRatePoint[] {
  const currentWeek = startOfUtcWeek(now);
  const buckets = new Map<string, { held: number; total: number; unknown: boolean; count: number }>();
  for (let index = 0; index < weeks; index += 1) {
    const week = new Date(currentWeek.getTime() - (weeks - 1 - index) * 7 * DAY_MS);
    buckets.set(isoDate(week), { held: 0, total: 0, unknown: false, count: 0 });
  }
  for (const row of rows) {
    const at = timestamp(row.created_at);
    if (at == null) continue;
    const key = isoDate(startOfUtcWeek(new Date(at)));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    if (!Number.isFinite(row.total_rows) || row.total_rows == null || !Number.isFinite(row.failed_rows) || row.failed_rows == null) {
      bucket.unknown = true;
      continue;
    }
    const total = Math.max(0, Math.trunc(row.total_rows));
    const held = Math.max(0, Math.trunc(row.failed_rows));
    bucket.total += total;
    bucket.held += Math.min(held, total);
  }
  return [...buckets.entries()].map(([weekStart, bucket]) => {
    const available = bucket.count > 0 && !bucket.unknown && bucket.total > 0;
    return {
      weekStart,
      heldRows: available ? bucket.held : null,
      totalRows: available ? bucket.total : null,
      percentage: available ? Math.round((bucket.held / bucket.total) * 10_000) / 100 : null,
      sampleCount: bucket.count,
      state: available ? 'available' : 'unavailable',
    };
  });
}

export type UptimeCell = {
  date: string;
  state: 'success' | 'degraded' | 'failed' | 'unknown';
  observedRuns: number;
};

function observationState(status: string | null | undefined, error: string | null | undefined): UptimeCell['state'] {
  if (error || /fail|dead|error/i.test(status ?? '')) return 'failed';
  if (/partial|degrad|retry|waiting|running|pending/i.test(status ?? '')) return 'degraded';
  if (/complete|success|committed|succeeded/i.test(status ?? '')) return 'success';
  return 'unknown';
}

type SyncObservation = {
  created_at?: string | null;
  status?: string | null;
  last_error_code?: string | null;
};

/** Build the required 28 daily source-health cells from actual runs. */
export function buildSourceUptimeCells(
  rows: SyncObservation[],
  now = new Date(),
  days = 28,
): UptimeCell[] {
  const result: UptimeCell[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const key = isoDate(date);
    const states = rows
      .filter((row) => row.created_at?.startsWith(key))
      .map((row) => observationState(row.status, row.last_error_code));
    const state = states.includes('failed')
      ? 'failed'
      : states.includes('degraded')
        ? 'degraded'
        : states.includes('success')
          ? 'success'
          : 'unknown';
    result.push({ date: key, state, observedRuns: states.length });
  }
  return result;
}

export type RecoveryAgeing = {
  stageSince: string | null;
  daysInStage: number | null;
  partnerWindowDays: number | null;
  remainingDays: number | null;
  deadlineAt: string | null;
  state: Availability;
};

type RecoveryEventObservation = { to_status?: string | null; created_at?: string | null };

export function deriveRecoveryAgeing(input: {
  createdAt?: string | null;
  status?: string | null;
  deadlineAt?: string | null;
  events?: RecoveryEventObservation[];
  now?: Date;
}): RecoveryAgeing {
  const now = input.now ?? new Date();
  const events = (input.events ?? [])
    .filter((event) => event.to_status === input.status && timestamp(event.created_at) != null)
    .sort((left, right) => timestamp(left.created_at)! - timestamp(right.created_at)!);
  const stageSince = events.at(-1)?.created_at ?? input.createdAt ?? null;
  const stageMs = timestamp(stageSince);
  const deadlineMs = timestamp(input.deadlineAt);
  const daysInStage = stageMs == null ? null : Math.max(0, Math.floor((now.getTime() - stageMs) / DAY_MS));
  const partnerWindowDays = stageMs != null && deadlineMs != null
    ? Math.max(0, Math.ceil((deadlineMs - stageMs) / DAY_MS))
    : null;
  const remainingDays = deadlineMs == null ? null : Math.ceil((deadlineMs - now.getTime()) / DAY_MS);
  return {
    stageSince,
    daysInStage,
    partnerWindowDays,
    remainingDays,
    deadlineAt: input.deadlineAt ?? null,
    state: stageMs != null ? 'available' : 'unavailable',
  };
}

export type LineItemMargin = {
  marginMinor: number | null;
  marginRatePercent: number | null;
  currency: string | null;
  state: Availability;
};

export function deriveLineItemMargin(input: {
  totalMinor?: number | null;
  costMinor?: number | null;
  currency?: string | null;
}): LineItemMargin {
  const total = input.totalMinor;
  const cost = input.costMinor;
  const currency = typeof input.currency === 'string' && /^[A-Za-z]{3}$/.test(input.currency) ? input.currency.toUpperCase() : null;
  const valid = currency != null && Number.isInteger(total) && Number.isInteger(cost) && total! >= 0 && cost! >= 0;
  if (!valid) return { marginMinor: null, marginRatePercent: null, currency, state: 'unavailable' };
  return {
    marginMinor: total! - cost!,
    marginRatePercent: total! === 0 ? null : Math.round(((total! - cost!) / total!) * 10_000) / 100,
    currency,
    state: 'available',
  };
}

export type CustodyLeg = {
  id: string;
  location: string | null;
  status: string | null;
  startedAt: string | null;
  endedAt: string | null;
  witnessed: boolean;
  evidenceEventIds: string[];
};

export type TrackingObservation = {
  id?: string | null;
  locationText?: string | null;
  status?: string | null;
  sourceStatus?: string | null;
  eventAt?: string | null;
  sourceEventAt?: string | null;
  sourceRecordId?: string | null;
};

/** Group contiguous provider scans into custody legs without inventing scans. */
export function deriveCustodyLegs(events: TrackingObservation[]): CustodyLeg[] {
  const ordered = [...events].sort((left, right) => (timestamp(left.sourceEventAt ?? left.eventAt) ?? Number.MAX_SAFE_INTEGER) - (timestamp(right.sourceEventAt ?? right.eventAt) ?? Number.MAX_SAFE_INTEGER));
  const legs: CustodyLeg[] = [];
  for (const event of ordered) {
    const location = event.locationText?.trim() || null;
    const status = event.sourceStatus?.trim() || event.status?.trim() || null;
    const current = legs.at(-1);
    if (current && current.location === location && current.status === status) {
      current.endedAt = event.sourceEventAt ?? event.eventAt ?? current.endedAt;
      if (event.id) current.evidenceEventIds.push(event.id);
      current.witnessed = current.witnessed || Boolean(event.id && (event.sourceRecordId || event.sourceEventAt || event.eventAt));
      continue;
    }
    legs.push({
      id: `leg-${legs.length + 1}`,
      location,
      status,
      startedAt: event.sourceEventAt ?? event.eventAt ?? null,
      endedAt: event.sourceEventAt ?? event.eventAt ?? null,
      witnessed: Boolean(event.id && (event.sourceRecordId || event.sourceEventAt || event.eventAt)),
      evidenceEventIds: event.id ? [event.id] : [],
    });
  }
  return legs;
}

export type TicketResponseTime = {
  fromAt: string;
  toAt: string;
  responseMs: number;
  fromActor: string | null;
  toActor: string | null;
};

export type TicketResponseSummary = {
  responses: TicketResponseTime[];
  medianMs: number | null;
  latestObservedAt: string | null;
  stopsAtLastObserved: true;
  state: Availability;
};

function actorRole(actor: string | null | undefined): 'customer' | 'staff' | 'unknown' {
  if (/customer|requester|end_user|buyer|shopper/i.test(actor ?? '')) return 'customer';
  if (/agent|staff|merchant|admin|operator|support|system/i.test(actor ?? '')) return 'staff';
  return 'unknown';
}

export function deriveTicketResponseTimes(entries: Array<{ actor?: string | null; at?: string | null; kind?: string }>): TicketResponseSummary {
  const ordered = entries
    .filter((entry) => entry.kind === 'message' && timestamp(entry.at) != null)
    .sort((left, right) => timestamp(left.at)! - timestamp(right.at)!);
  const responses: TicketResponseTime[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (actorRole(previous.actor) !== 'customer' || actorRole(current.actor) !== 'staff') continue;
    responses.push({
      fromAt: previous.at!,
      toAt: current.at!,
      responseMs: timestamp(current.at)! - timestamp(previous.at)!,
      fromActor: previous.actor ?? null,
      toActor: current.actor ?? null,
    });
  }
  const sorted = responses.map((response) => response.responseMs).sort((left, right) => left - right);
  const medianMs = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
  return {
    responses,
    medianMs,
    latestObservedAt: ordered.at(-1)?.at ?? null,
    stopsAtLastObserved: true,
    state: ordered.length > 1 && responses.length > 0 ? 'available' : 'unavailable',
  };
}

export type DisputeCountdown = {
  elapsedDays: number | null;
  remainingDays: number | null;
  closesInsideNetworkWindow: boolean | null;
  deadlineAt: string | null;
  state: Availability;
};

export function deriveDisputeCountdown(input: {
  initiatedAt?: string | null;
  deadlineAt?: string | null;
  periodEndAt?: string | null;
  now?: Date;
}): DisputeCountdown {
  const now = input.now ?? new Date();
  const initiatedMs = timestamp(input.initiatedAt);
  const deadlineMs = timestamp(input.deadlineAt);
  if (initiatedMs == null || deadlineMs == null) {
    return { elapsedDays: null, remainingDays: null, closesInsideNetworkWindow: null, deadlineAt: input.deadlineAt ?? null, state: 'unavailable' };
  }
  const periodEndMs = timestamp(input.periodEndAt);
  return {
    elapsedDays: Math.max(0, Math.floor((now.getTime() - initiatedMs) / DAY_MS)),
    remainingDays: Math.ceil((deadlineMs - now.getTime()) / DAY_MS),
    closesInsideNetworkWindow: periodEndMs == null ? null : periodEndMs >= initiatedMs && periodEndMs <= deadlineMs,
    deadlineAt: input.deadlineAt!,
    state: 'available',
  };
}

export type PartnerStatistics = {
  sampleSize: number;
  payRatePercent: number | null;
  medianDays: number | null;
  state: Availability;
};

export function derivePartnerStatistics(rows: Array<{ status?: string | null; createdAt?: string | null; respondedAt?: string | null }>): PartnerStatistics {
  const usable = rows.filter((row) => timestamp(row.createdAt) != null);
  const paid = usable.filter((row) => /paid|approved|credited|reconciled/i.test(row.status ?? '')).length;
  const durations = usable
    .map((row) => {
      const end = timestamp(row.respondedAt);
      const start = timestamp(row.createdAt);
      return end != null && start != null && end >= start ? Math.round((end - start) / DAY_MS) : null;
    })
    .filter((value): value is number => value != null);
  durations.sort((left, right) => left - right);
  return {
    sampleSize: usable.length,
    payRatePercent: usable.length ? Math.round((paid / usable.length) * 10_000) / 100 : null,
    medianDays: durations.length ? durations[Math.floor((durations.length - 1) / 2)] : null,
    state: usable.length > 0 ? 'available' : 'unavailable',
  };
}

export type CreditBurnForecast = {
  projectedExhaustionAt: string | null;
  observationWindowDays: number | null;
  dailyRate: number | null;
  creditsObserved: number | null;
  modelBasis: string;
  state: Availability;
};

export function deriveCreditBurnForecast(
  events: Array<{ occurred_at?: string | null; credits_spent?: number | null; refunded_credits?: number | null; status?: string | null }>,
  remaining: number | null,
  now = new Date(),
): CreditBurnForecast {
  const usable = events
    .map((event) => ({ at: timestamp(event.occurred_at), amount: Number(event.credits_spent ?? 0) - Number(event.refunded_credits ?? 0), status: event.status }))
    .filter((event) => event.at != null && event.amount > 0 && event.status !== 'reversed');
  const first = usable.reduce<number | null>((value, event) => value == null ? event.at : Math.min(value, event.at!), null);
  const last = usable.reduce<number | null>((value, event) => value == null ? event.at : Math.max(value, event.at!), null);
  const creditsObserved = usable.reduce((sum, event) => sum + event.amount, 0);
  const observationWindowDays = first == null || last == null ? null : Math.max(1, (last - first) / DAY_MS);
  const dailyRate = observationWindowDays != null && usable.length >= 2 ? creditsObserved / observationWindowDays : null;
  const projectedExhaustionAt = dailyRate != null && dailyRate > 0 && remaining != null && remaining >= 0
    ? new Date(now.getTime() + (remaining / dailyRate) * DAY_MS).toISOString()
    : null;
  return {
    projectedExhaustionAt,
    observationWindowDays: observationWindowDays == null ? null : Math.round(observationWindowDays * 100) / 100,
    dailyRate: dailyRate == null ? null : Math.round(dailyRate * 100) / 100,
    creditsObserved: usable.length >= 2 ? creditsObserved : null,
    modelBasis: 'Successful, non-reversed context-credit events only; at least two observations are required.',
    state: dailyRate != null ? 'available' : 'unavailable',
  };
}

export type RestatementPreview = {
  baseMinor: number;
  proposedMinor: number | null;
  baseCurrency: string;
  proposedCurrency: string;
  rate: number | null;
  rateDate: string | null;
  state: Availability;
};

export function buildRestatementPreview(input: {
  baseMinor: number;
  baseCurrency: string;
  proposedCurrency: string;
  rate?: number | null;
  rateDate?: string | null;
}): RestatementPreview {
  const baseCurrency = input.baseCurrency.toUpperCase();
  const proposedCurrency = input.proposedCurrency.toUpperCase();
  const rate = input.rate;
  const valid = Number.isInteger(input.baseMinor) && input.baseMinor >= 0 && /^[A-Z]{3}$/.test(baseCurrency) && /^[A-Z]{3}$/.test(proposedCurrency) && Number.isFinite(rate) && rate! > 0 && Boolean(input.rateDate) && !Number.isNaN(Date.parse(input.rateDate!));
  return {
    baseMinor: input.baseMinor,
    proposedMinor: valid ? Math.round(input.baseMinor * rate!) : null,
    baseCurrency,
    proposedCurrency,
    rate: valid ? rate! : null,
    rateDate: input.rateDate ?? null,
    state: valid ? 'available' : 'unavailable',
  };
}

export type ActorActionSummary = {
  actorUserId: string | null;
  action: string;
  count: number;
  financialRecordAction: boolean;
  movedMoney: false;
};

export function buildActorActionSummary(rows: Array<{ actor_user_id?: string | null; action?: string | null }>): ActorActionSummary[] {
  const map = new Map<string, ActorActionSummary>();
  for (const row of rows) {
    const action = row.action ?? 'unknown';
    const actor = row.actor_user_id ?? null;
    const key = `${actor ?? 'system'}:${action}`;
    const current = map.get(key) ?? {
      actorUserId: actor,
      action,
      count: 0,
      financialRecordAction: /loss|reconcil|recover|write.?off|payout|refund|claim|decision|close/i.test(action),
      movedMoney: false,
    };
    current.count += 1;
    map.set(key, current);
  }
  return [...map.values()].sort((left, right) => right.count - left.count || left.action.localeCompare(right.action));
}
