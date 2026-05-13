import { evaluateUsageGuard, DEFAULT_FREE_DATABASE_LIMIT_MB } from '../../lib/processing/supabaseUsageGuard';

describe('evaluateUsageGuard', () => {
  beforeEach(() => {
    delete process.env.SUPABASE_DB_USAGE_LIMIT_MB;
    delete process.env.SUPABASE_DB_USAGE_HEADROOM_MB;
  });

  it('allows a run when database usage is comfortably below the safety margin', () => {
    const thresholdMb = DEFAULT_FREE_DATABASE_LIMIT_MB - 40;
    const belowThresholdBytes = Math.round((thresholdMb - 20) * 1024 * 1024);

    const decision = evaluateUsageGuard(belowThresholdBytes);

    expect(decision.shouldStop).toBe(false);
    expect(decision.snapshot?.databaseBytes).toBe(belowThresholdBytes);
    expect(decision.reason).toBeNull();
  });

  it('stops a run when database usage reaches the safety margin', () => {
    const limitMb = 500;
    const headroomMb = 40;
    process.env.SUPABASE_DB_USAGE_LIMIT_MB = String(limitMb);
    process.env.SUPABASE_DB_USAGE_HEADROOM_MB = String(headroomMb);

    const tripBytes = Math.round((limitMb - headroomMb + 1) * 1024 * 1024);
    const decision = evaluateUsageGuard(tripBytes);

    expect(decision.shouldStop).toBe(true);
    expect(decision.reason).toContain('free-tier limit');
    expect(decision.reason).toContain('Stopping this CSV run');
  });
});
