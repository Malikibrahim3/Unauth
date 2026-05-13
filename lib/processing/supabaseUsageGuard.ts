import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

export const DEFAULT_FREE_DATABASE_LIMIT_MB = 500;
export const DEFAULT_USAGE_HEADROOM_MB = 40;

export interface UsageGuardSnapshot {
  databaseBytes: number;
  limitBytes: number;
  headroomBytes: number;
  remainingBytes: number;
}

export interface UsageGuardDecision {
  shouldStop: boolean;
  reason: string | null;
  snapshot: UsageGuardSnapshot | null;
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getGuardConfig() {
  const limitMb = parsePositiveNumber(
    process.env.SUPABASE_DB_USAGE_LIMIT_MB,
    DEFAULT_FREE_DATABASE_LIMIT_MB
  );
  const headroomMb = parsePositiveNumber(
    process.env.SUPABASE_DB_USAGE_HEADROOM_MB,
    DEFAULT_USAGE_HEADROOM_MB
  );

  const limitBytes = Math.round(limitMb * 1024 * 1024);
  const headroomBytes = Math.round(Math.min(headroomMb, limitMb) * 1024 * 1024);
  const thresholdBytes = Math.max(0, limitBytes - headroomBytes);

  return {
    limitMb,
    headroomMb,
    limitBytes,
    headroomBytes,
    thresholdBytes,
  };
}

export function evaluateUsageGuard(databaseBytes: number): UsageGuardDecision {
  const { limitMb, headroomMb, limitBytes, headroomBytes, thresholdBytes } = getGuardConfig();
  const remainingBytes = thresholdBytes - databaseBytes;

  if (remainingBytes <= 0) {
    const usedMb = databaseBytes / 1024 / 1024;
    const remainingMb = remainingBytes / 1024 / 1024;
    return {
      shouldStop: true,
      snapshot: {
        databaseBytes,
        limitBytes,
        headroomBytes,
        remainingBytes,
      },
      reason:
        `Supabase database usage is too close to the free-tier limit (${usedMb.toFixed(1)} MB used of ${limitMb} MB, ` +
        `${remainingMb.toFixed(1)} MB remaining before the safety margin of ${headroomMb} MB). ` +
        'Stopping this CSV run now so the rows already written stay intact.',
    };
  }

  return {
    shouldStop: false,
    snapshot: {
      databaseBytes,
      limitBytes,
      headroomBytes,
      remainingBytes,
    },
    reason: null,
  };
}

function coerceDatabaseBytes(row: unknown): number | null {
  if (typeof row === 'number' && Number.isFinite(row)) return row;
  if (typeof row === 'string') {
    const parsed = Number(row);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (!row || typeof row !== 'object') return null;
  const value = (row as Record<string, unknown>).database_bytes;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function checkCsvUsageGuard(
  serviceClient: SupabaseClient<Database>
): Promise<UsageGuardDecision> {
  const { data, error } = await serviceClient.rpc('current_database_size_bytes' as any);
  if (error) {
    return {
      shouldStop: false,
      snapshot: null,
      reason: `Usage guard could not read Supabase database size (${error.message}); continuing run.`,
    };
  }

  const rows = Array.isArray(data) ? data : [data];
  const databaseBytes = coerceDatabaseBytes(rows[0]);
  if (databaseBytes == null) {
    return {
      shouldStop: false,
      snapshot: null,
      reason: 'Usage guard received an unexpected database-size response; continuing run.',
    };
  }

  return evaluateUsageGuard(databaseBytes);
}
