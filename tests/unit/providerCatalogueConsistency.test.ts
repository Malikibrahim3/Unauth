/**
 * Cross-surface truthfulness for provider build maturity.
 *
 * Build maturity is derived only from the canonical lifecycle evidence model.
 * Per-merchant connection health is deliberately a separate concern.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assertLiveProvider } from '@/lib/integrations/auth';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import {
  CONTROLLED_RUNTIME_EVIDENCE_MAX_AGE_DAYS,
  deriveProviderDisplayStage,
  hasValidControlledRuntimeEvidence,
  INTEGRATION_PROVIDERS,
  isRuntimeVerificationPending,
  pendingRuntimeCapabilities,
} from '@/lib/integrations/registry';
import type {
  IntegrationProvider,
  LifecycleCapability,
  LifecycleCapabilityId,
} from '@/lib/integrations/types';
import { createFakeSupabaseClient } from '../helpers/fakeSupabaseClient';

const DIMENSIONS: LifecycleCapabilityId[] = [
  'connect', 'account_verification', 'initial_import', 'incremental_pull', 'webhook',
  'reconciliation', 'reconnect', 'disconnect', 'freshness_health', 'bounded_writeback',
];

function providerWith(
  lifecycle: LifecycleCapability[],
  overrides: Partial<IntegrationProvider> = {},
): IntegrationProvider {
  return {
    id: 'proof-fixture',
    name: 'Proof fixture',
    category: 'commerce',
    authMode: 'oauth',
    buildStatus: 'live',
    evidenceCapabilities: ['order_value'],
    lifecycle,
    ...overrides,
  };
}

function runtimeEvidence(verifiedAt = new Date().toISOString()) {
  return {
    environment: 'local-isolated',
    account: 'controlled-merchant-a',
    verifiedAt,
    build: 'fixture-build',
    scenario: 'connect, import, repair, reconnect and disconnect',
    result: 'passed' as const,
    limitations: [],
    artifactRef: 'test-results/provider-proof/fixture.json',
  };
}

describe('the catalogue is the single source of provider display maturity', () => {
  it('never disagrees with deriveProviderDisplayStage and carries the same lifecycle evidence', async () => {
    const client = createFakeSupabaseClient({});
    const catalogue = await loadConnectorCatalogue(client as never, 'merchant-a');
    const byId = Object.fromEntries(INTEGRATION_PROVIDERS.map((p) => [p.id, p]));
    for (const item of catalogue) {
      const provider = byId[item.id];
      expect(item.stage).toBe(deriveProviderDisplayStage(provider));
      expect(item.lifecycle).toEqual(provider.lifecycle ?? []);
      expect(item.runtimeVerificationPending).toBe(isRuntimeVerificationPending(provider));
      expect(item.pendingRuntimeCapabilities).toEqual(pendingRuntimeCapabilities(provider));
    }
  });

  it('lib/connectors/catalogue.ts has no competing stage derivation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/connectors/catalogue.ts'), 'utf-8');
    expect(source).not.toContain('function stageFor');
    expect(source).toContain('deriveProviderDisplayStage(provider)');
  });

  it('per-merchant connection health cannot upgrade build maturity', () => {
    const codeOnly = providerWith([
      { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'Code exists.' },
      { id: 'webhook', applicability: 'applicable', evidence: 'automated_tested', detail: 'Test passed.' },
    ]);
    const connectedMerchantView = { ...codeOnly, status: 'connected', lastVerifiedAt: new Date().toISOString() } as IntegrationProvider;
    expect(deriveProviderDisplayStage(codeOnly)).toBe('beta');
    expect(deriveProviderDisplayStage(connectedMerchantView)).toBe('beta');
  });
});

describe('controlled runtime proof is distinct and mandatory for Live', () => {
  it('code-only evidence cannot derive Live for a runtime-dependent provider', () => {
    const provider = providerWith(DIMENSIONS.map((id) => ({
      id,
      applicability: id === 'bounded_writeback' ? 'not_applicable' : 'applicable',
      evidence: id === 'bounded_writeback' ? 'unavailable' : 'implemented',
      detail: 'Implementation located; runtime not executed.',
    })));
    expect(deriveProviderDisplayStage(provider)).not.toBe('live');
  });

  it('manual_upload alone cannot derive Live', () => {
    const provider = providerWith([
      { id: 'connect', applicability: 'applicable', evidence: 'implemented', detail: 'Upload route exists.' },
      { id: 'initial_import', applicability: 'applicable', evidence: 'automated_tested', detail: 'Mapping test passed.' },
    ], { authMode: 'manual_upload' });
    expect(deriveProviderDisplayStage(provider)).toBe('partial');
    expect(isRuntimeVerificationPending(provider)).toBe(true);
  });

  it('missing controlled evidence downgrades and enumerates the missing capability', () => {
    const provider = providerWith([
      {
        id: 'connect', applicability: 'applicable', evidence: 'controlled_runtime_verified',
        runtimeEvidence: runtimeEvidence(), detail: 'Controlled connect passed.',
      },
      {
        id: 'initial_import', applicability: 'applicable', evidence: 'controlled_runtime_verified',
        detail: 'Claim has no artifact and must not count.',
      },
    ]);
    expect(deriveProviderDisplayStage(provider)).toBe('partial');
    expect(pendingRuntimeCapabilities(provider)).toEqual(['initial_import']);
  });

  it('stale controlled proof downgrades truthfully', () => {
    const stale = new Date(
      Date.now() - (CONTROLLED_RUNTIME_EVIDENCE_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const lifecycle: LifecycleCapability[] = [
      {
        id: 'connect', applicability: 'applicable', evidence: 'controlled_runtime_verified',
        runtimeEvidence: runtimeEvidence(stale), detail: 'Old run.',
      },
    ];
    expect(hasValidControlledRuntimeEvidence(lifecycle[0])).toBe(false);
    expect(deriveProviderDisplayStage(providerWith(lifecycle))).toBe('partial');
  });

  it('failed results and incomplete evidence records cannot count as controlled proof', () => {
    const failed: LifecycleCapability = {
      id: 'connect', applicability: 'applicable', evidence: 'controlled_runtime_verified',
      runtimeEvidence: { ...runtimeEvidence(), result: 'failed' }, detail: 'Scenario failed.',
    };
    const missingArtifact: LifecycleCapability = {
      id: 'connect', applicability: 'applicable', evidence: 'controlled_runtime_verified',
      runtimeEvidence: { ...runtimeEvidence(), artifactRef: '' }, detail: 'No artifact.',
    };
    expect(hasValidControlledRuntimeEvidence(failed)).toBe(false);
    expect(hasValidControlledRuntimeEvidence(missingArtifact)).toBe(false);
  });

  it('derives Live only when every applicable capability has fresh, complete, passing proof', () => {
    const lifecycle: LifecycleCapability[] = [
      {
        id: 'connect', applicability: 'applicable', evidence: 'controlled_runtime_verified',
        runtimeEvidence: runtimeEvidence(), detail: 'Controlled connect passed.',
      },
      {
        id: 'initial_import', applicability: 'applicable', evidence: 'controlled_runtime_verified',
        runtimeEvidence: runtimeEvidence(), detail: 'Controlled import passed.',
      },
      {
        id: 'bounded_writeback', applicability: 'not_applicable', evidence: 'unavailable',
        detail: 'Not offered.',
      },
    ];
    expect(deriveProviderDisplayStage(providerWith(lifecycle))).toBe('live');
  });
});

describe('planned providers cannot expose a functional Connect action', () => {
  it('assertLiveProvider throws and the stage remains planned for every slot_only provider', () => {
    for (const provider of INTEGRATION_PROVIDERS.filter((p) => p.buildStatus === 'slot_only')) {
      expect(() => assertLiveProvider(provider)).toThrow('provider_is_slot_only');
      expect(deriveProviderDisplayStage(provider)).toBe('planned');
    }
  });

  it('assertLiveProvider keeps genuinely offered non-slot providers connectable', () => {
    for (const provider of INTEGRATION_PROVIDERS.filter((p) => p.buildStatus !== 'slot_only')) {
      expect(() => assertLiveProvider(provider)).not.toThrow();
    }
  });

  it('the provider detail and list pages gate planned connections', () => {
    const detailPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/integrations/[provider]/page.tsx'),
      'utf-8',
    );
    const listPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/integrations/page.tsx'),
      'utf-8',
    );
    expect(detailPage).toMatch(/item\.stage === ["']planned["']\s*\?/);
    expect(detailPage).toContain('<ConnectionActions');
    expect(listPage).toMatch(/item\.stage === ["']planned["']/);
    expect(listPage).toContain('item.stage !== "planned"');
  });
});

describe('capability rendering matches the evidence model', () => {
  it('every provider covers all ten dimensions exactly once', () => {
    for (const provider of INTEGRATION_PROVIDERS) {
      const lifecycle = provider.lifecycle ?? [];
      expect(lifecycle.map((dim) => dim.id).sort()).toEqual([...DIMENSIONS].sort());
      expect(new Set(lifecycle.map((dim) => dim.id)).size).toBe(DIMENSIONS.length);
      expect(lifecycle.every((dim) => dim.detail.trim().length > 0)).toBe(true);
    }
  });

  it('the detail page names pending runtime verification and renders every evidence field', () => {
    const detailPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/integrations/[provider]/page.tsx'),
      'utf-8',
    );
    expect(detailPage).toContain('Runtime verification pending');
    expect(detailPage).toContain('item.pendingRuntimeCapabilities');
    expect(detailPage).toContain('dim.evidence');
    expect(detailPage).toContain('dim.runtimeEvidence');
  });

  it('every lifecycle dimension and evidence level has display copy and a badge tone', () => {
    const labelsSource = fs.readFileSync(path.join(process.cwd(), 'lib/ui/labels.ts'), 'utf-8');
    const badgeSource = fs.readFileSync(path.join(process.cwd(), 'components/ui/StatusBadge.tsx'), 'utf-8');
    for (const dim of DIMENSIONS) expect(labelsSource).toContain(`${dim}:`);
    for (const state of ['implemented', 'automated_tested', 'controlled_runtime_verified', 'unavailable', 'not_applicable']) {
      expect(labelsSource).toContain(`${state}:`);
      expect(badgeSource).toContain(`${state}:`);
    }
  });
});
