/**
 * Phase E-7 — Identity Cluster Visualisation
 *
 * ⚠️  DEFERRED — HIGH RISK  ⚠️
 *
 * This component is NOT implemented in Phase E.
 *
 * Deferral criteria:
 *   1. Requires senior code review before landing on main.
 *   2. Must coordinate with Phase 4 of ASOS_REMEDIATION_PROGRAM.md.
 *   3. Requires dependency sign-off for react-flow or d3-force.
 *   4. Feature flag: FLAG_IDENTITY_CLUSTER_GRAPH — do NOT enable until
 *      all three gates above are cleared.
 *
 * When implementing:
 *   - Read linker output READ-ONLY. No writes to lib/linker.ts or lib/identity/*.
 *   - Use neutral background (var(--bg-surface)), single accent (var(--accent-500))
 *     for highlights only.
 *   - Restrained visual — no decorative gradients, no animation beyond enter.
 *   - Multi-tenant isolation: all node/edge data scoped to merchant's own clusters.
 *
 * This stub exists so the file path is committed and reviewable.
 */

'use client';

import { FLAG_IDENTITY_CLUSTER_GRAPH } from '@/lib/flags';

export interface IdentityClusterGraphProps {
  clusterId: string;
  className?: string;
}

/**
 * IdentityClusterGraph — renders a force-directed graph of an identity cluster.
 *
 * DEFERRED: returns null (and a dev-mode warning) until the senior review
 * gate is cleared and the flag is enabled.
 */
export function IdentityClusterGraph({ clusterId }: IdentityClusterGraphProps) {
  if (!FLAG_IDENTITY_CLUSTER_GRAPH) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[IdentityClusterGraph] FLAG_IDENTITY_CLUSTER_GRAPH is false. ' +
        'This component is deferred until Phase E senior-review gate is cleared. ' +
        `Cluster: ${clusterId}`,
      );
    }
    return null;
  }

  // TODO: Implement using react-flow or d3-force after:
  //   1. Senior code review approval
  //   2. Phase 4 coordination complete
  //   3. Dependency decision (react-flow vs d3-force) signed off
  //
  // Data source: /api/customers/[id]/cluster (new endpoint, read-only linker output)
  // Styling: neutral bg, single accent highlight, no animation beyond enter.
  // Multi-tenant: cluster data scoped via processing_jobs.merchant_id.

  return (
    <div
      className="flex items-center justify-center h-48 rounded-lg border"
      style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-small text-[var(--text-tertiary)]">
        Identity cluster visualisation — coming in Phase E (senior review pending)
      </p>
    </div>
  );
}
