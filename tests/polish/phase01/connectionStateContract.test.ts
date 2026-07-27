/**
 * RUN-18 — one canonical connection read model across every consumer.
 *
 * Configuration ("can this provider be used?") and operational health ("can we
 * trust the signal right now?") are separate axes, impossible combinations are
 * rejected at the boundary, and every merchant-facing surface resolves through
 * the same validating entry point rather than deciding for itself.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  ImpossibleConnectionState,
  assertPossibleConnectionState,
  connectionReadModel,
  type ConnectionReadModel,
} from '@/lib/connections/readModel';

function model(overrides: Partial<ConnectionReadModel>): ConnectionReadModel {
  return {
    providerId: 'shopify',
    configuration: 'configured',
    operational: 'healthy',
    badge: 'healthy',
    note: null,
    noteTone: 'neutral',
    syncState: 'synced',
    deliveryModel: 'webhook',
    freshnessConfidence: 'high',
    lastDataReceivedAt: '2026-07-26T10:00:00.000Z',
    lastVerifiedAt: '2026-07-26T10:00:00.000Z',
    importedRecords: 12,
    ...overrides,
  } as ConnectionReadModel;
}

describe('RUN-18 canonical connection state', () => {
  it('accepts a coherent configured and healthy provider', () => {
    expect(() => assertPossibleConnectionState(model({}))).not.toThrow();
  });

  it('rejects a provider that is not configured yet reports healthy', () => {
    expect(() =>
      assertPossibleConnectionState(model({ configuration: 'not_configured', operational: 'healthy' })),
    ).toThrow(ImpossibleConnectionState);
  });

  it('rejects a configured provider whose health is unknown', () => {
    expect(() =>
      assertPossibleConnectionState(model({ configuration: 'configured', operational: 'unknown' })),
    ).toThrow(ImpossibleConnectionState);
  });

  it('rejects a continuously delivering source that is healthy before any data arrived', () => {
    expect(() =>
      assertPossibleConnectionState(model({ deliveryModel: 'periodic_sync', lastDataReceivedAt: null })),
    ).toThrow(ImpossibleConnectionState);
  });

  it('allows an on-demand source to be healthy with no delivered data', () => {
    // On-demand providers are only queried when asked, so "nothing received
    // yet" is an ordinary state rather than a fault.
    expect(() =>
      assertPossibleConnectionState(model({ deliveryModel: 'on_demand', lastDataReceivedAt: null })),
    ).not.toThrow();
  });

  it('keeps configuration and operational health as independent axes', () => {
    const attention = assertPossibleConnectionState(model({ operational: 'attention', badge: 'attention' }));
    expect(attention.configuration).toBe('configured');
    expect(attention.operational).toBe('attention');
  });

  it('resolves a disconnected provider as not configured with unknown health', () => {
    const resolved = connectionReadModel({
      providerId: 'gorgias',
      syncState: 'disconnected',
      freshness: {
        deliveryModel: 'webhook',
        confidence: 'unavailable',
        lastDataReceivedAt: null,
        lastSyncAttemptAt: null,
      },
    });
    expect(resolved.configuration).toBe('not_configured');
    expect(resolved.operational).toBe('unknown');
  });

  it('routes every merchant-facing consumer through the validating entry point', () => {
    /*
     * The audited defect was each surface deriving its own state. Any consumer
     * that imports the unvalidated resolver, or reaches past it into
     * effectiveStatus, would reintroduce that.
     */
    const surfaces: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry)) surfaces.push(path);
      }
    };
    walk('app/(app)');
    walk('components');

    /*
     * The dev-only status gallery is the single approved exception: its whole
     * purpose is to render states that no available credential can produce, so
     * it drives the underlying resolver directly. It is not a merchant surface.
     */
    const APPROVED_EXCEPTIONS = ['app/(app)/integrations/dev-preview/page.tsx'];

    const offenders = surfaces.filter((file) => {
      if (APPROVED_EXCEPTIONS.includes(file)) return false;
      const source = readFileSync(file, 'utf8');
      return (
        source.includes('resolveConnectionReadModel(') ||
        source.includes('resolveEffectiveConnectionStatus(')
      );
    });
    expect(offenders).toEqual([]);
  });
});
