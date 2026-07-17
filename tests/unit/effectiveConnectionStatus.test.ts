import { resolveEffectiveConnectionStatus, isLiveCredentialCheckSupported } from '@/lib/connections/effectiveStatus';
import type { LiveVerificationResult } from '@/lib/connections/liveVerification';
import type { ConnectionSyncState } from '@/lib/integrations/syncState';
import type { ConnectorFreshness } from '@/lib/connections/freshness';

const VERIFIED: LiveVerificationResult = { status: 'verified' };
const FAILED: LiveVerificationResult = { status: 'failed', reason: 'credentials_revoked' };
const INCONCLUSIVE: LiveVerificationResult = { status: 'inconclusive', reason: 'network_or_timeout' };

const MEASURED_FRESH: ConnectorFreshness = { confidence: 'measured', deliveryModel: 'webhook', lastDataReceivedAt: '2026-07-16T00:00:00Z', lastSyncAttemptAt: '2026-07-16T00:00:00Z' };
const UNMEASURABLE_ON_DEMAND: ConnectorFreshness = { confidence: 'unavailable', deliveryModel: 'on_demand', lastDataReceivedAt: null, lastSyncAttemptAt: null, reason: 'on_demand_provider' };
const UNMEASURABLE_UNAUDITED: ConnectorFreshness = { confidence: 'unavailable', deliveryModel: 'webhook', lastDataReceivedAt: null, lastSyncAttemptAt: null, reason: 'no_freshness_resolver' };

describe('resolveEffectiveConnectionStatus — precedence truth table', () => {
  // 1. Disconnected always wins, regardless of what the credential probe says.
  it.each([VERIFIED, FAILED, INCONCLUSIVE, null])('disconnected overrides any live probe result (%p)', (liveResult) => {
    const result = resolveEffectiveConnectionStatus(liveResult, 'disconnected', MEASURED_FRESH);
    expect(result).toEqual({ bucket: 'not_connected', badge: 'disconnected', note: null, noteTone: null });
  });

  // 2. Credential/auth failure overrides every sync-state signal, including fresh data.
  it.each<ConnectionSyncState>(['import_complete', 'stale', 'no_records_found', 'import_queued', 'sync_failed'])(
    'a failed credential check wins over sync state %s',
    (syncState) => {
      const result = resolveEffectiveConnectionStatus(FAILED, syncState, MEASURED_FRESH);
      expect(result.bucket).toBe('error');
      expect(result.badge).toBe('error');
      expect(result.noteTone).toBe('danger');
      // Public-safe: never the raw provider reason string leaking unmapped.
      expect(result.note).toBe('Provider authorization needs attention. Reconnect the connection and retry.');
    },
  );

  // 3. Sync/connector failure — real error code present.
  it.each<ConnectionSyncState>(['sync_failed', 'attention_required'])('reports %s as not_syncing', (syncState) => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, syncState, MEASURED_FRESH);
    expect(result.bucket).toBe('attention_required');
    expect(result.badge).toBe('not_syncing');
    expect(result.noteTone).toBe('warning');
  });

  it('a valid credential does not erase a recorded sync failure', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'sync_failed', MEASURED_FRESH);
    expect(result.bucket).toBe('attention_required');
  });

  // On-demand providers (UPS/FedEx): no periodic-sync vocabulary applies, and
  // a successful probe only proves the connector is currently queryable —
  // not that data flows continuously, so it must NOT reuse the "healthy"
  // badge (which implies a measured, fresh, ongoing signal).
  it('on-demand provider with valid credentials reports connection_verified, not perpetual sync_pending, and never "healthy"', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'import_queued', UNMEASURABLE_ON_DEMAND);
    expect(result).toEqual({ bucket: 'connected', badge: 'connection_verified', note: null, noteTone: null });
    expect(result.badge).not.toBe('healthy');
  });

  it('on-demand provider with valid credentials never reports "stale" either, regardless of how old the row is', () => {
    // deriveSyncState is never even consulted for on_demand_provider — this
    // proves lack of a periodic freshness signal cannot produce "stale".
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'stale', UNMEASURABLE_ON_DEMAND);
    expect(result.badge).toBe('connection_verified');
  });

  it('on-demand provider with an inconclusive credential check reports verification_unavailable', () => {
    const result = resolveEffectiveConnectionStatus(INCONCLUSIVE, 'import_queued', UNMEASURABLE_ON_DEMAND);
    expect(result.bucket).toBe('connected');
    expect(result.badge).toBe('verification_unavailable');
  });

  it('on-demand provider with no probe result at all reports verification_unavailable, not connection_verified', () => {
    const result = resolveEffectiveConnectionStatus(null, 'import_complete', UNMEASURABLE_ON_DEMAND);
    expect(result.badge).toBe('verification_unavailable');
  });

  it('an unsupported/unverified on-demand path never reports "healthy"', () => {
    const inconclusive = resolveEffectiveConnectionStatus(INCONCLUSIVE, 'import_complete', UNMEASURABLE_ON_DEMAND);
    const none = resolveEffectiveConnectionStatus(null, 'import_complete', UNMEASURABLE_ON_DEMAND);
    expect(inconclusive.badge).not.toBe('healthy');
    expect(none.badge).not.toBe('healthy');
  });

  it('credential failure still overrides the on-demand connection_verified state', () => {
    const result = resolveEffectiveConnectionStatus(FAILED, 'import_complete', UNMEASURABLE_ON_DEMAND);
    expect(result.bucket).toBe('error');
    expect(result.badge).toBe('error');
  });

  // 4. Stale data.
  it('valid credentials + stale data must not read as an unqualified healthy state', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'stale', MEASURED_FRESH);
    expect(result.bucket).toBe('connected');
    expect(result.badge).toBe('stale');
    expect(result.noteTone).toBe('warning');
    expect(result.note).toMatch(/hasn't synced since/);
  });

  // 5. Initial sync pending.
  it.each<ConnectionSyncState>(['import_queued', 'importing'])('valid credentials + %s reports sync_pending, not healthy', (syncState) => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, syncState, MEASURED_FRESH);
    expect(result).toEqual({ bucket: 'connected', badge: 'sync_pending', note: null, noteTone: null });
  });

  // 6. Successfully connected, zero records.
  it('valid credentials + no records reports no_data', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'no_records_found', MEASURED_FRESH);
    expect(result.bucket).toBe('connected');
    expect(result.badge).toBe('no_data');
  });

  // 7. Healthy and fresh.
  it('valid credentials + complete + measured fresh data reports healthy', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'import_complete', MEASURED_FRESH);
    expect(result).toEqual({ bucket: 'connected', badge: 'healthy', note: null, noteTone: null });
  });

  // 8. Verification unavailable fallback — audited-but-unsupported freshness.
  it('complete sync state but an unaudited freshness resolver reports verification_unavailable, not healthy', () => {
    const result = resolveEffectiveConnectionStatus(VERIFIED, 'import_complete', UNMEASURABLE_UNAUDITED);
    expect(result.badge).toBe('verification_unavailable');
  });

  it('an inconclusive credential re-check on otherwise-healthy data reports verification_unavailable', () => {
    const result = resolveEffectiveConnectionStatus(INCONCLUSIVE, 'import_complete', MEASURED_FRESH);
    expect(result.bucket).toBe('connected');
    expect(result.badge).toBe('verification_unavailable');
  });

  // Regression: polling / repeated-check idempotence at the function level —
  // calling with the same inputs must always produce the same result.
  it('is a pure function — repeated calls with identical inputs are idempotent', () => {
    const first = resolveEffectiveConnectionStatus(VERIFIED, 'stale', MEASURED_FRESH);
    const second = resolveEffectiveConnectionStatus(VERIFIED, 'stale', MEASURED_FRESH);
    expect(first).toEqual(second);
  });

  // Regression: a subsequent failed check overrides a previously healthy verdict.
  it('a newly failed credential check overrides a previously healthy verdict', () => {
    const before = resolveEffectiveConnectionStatus(VERIFIED, 'import_complete', MEASURED_FRESH);
    expect(before.badge).toBe('healthy');
    const after = resolveEffectiveConnectionStatus(FAILED, 'import_complete', MEASURED_FRESH);
    expect(after.badge).toBe('error');
  });
});

describe('isLiveCredentialCheckSupported', () => {
  it.each(['shopify', 'gorgias', 'shipbob', 'ups', 'fedex'])('supports %s', (id) => {
    expect(isLiveCredentialCheckSupported(id)).toBe(true);
  });

  it.each(['zendesk', 'freshdesk', 'woocommerce', 'bigcommerce'])('does not claim support for %s', (id) => {
    expect(isLiveCredentialCheckSupported(id)).toBe(false);
  });
});
