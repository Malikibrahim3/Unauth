'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import 'reactflow/dist/style.css';
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from 'reactflow';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { NetworkFootprint } from '@/components/ui/NetworkFootprint';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { Button } from '@/components/ui/Button';

export type GlobalGraphProfile = {
  id: string;
  primary_email: string | null;
  risk_level: string;
  risk_score: number;
  total_orders: number;
  total_merchants_seen_at: number;
  total_refund_claims: number;
  first_seen: string;
  last_seen: string;
  identity_confidence_grade: string | null;
  identity_signals_summary: string[] | null;
};

type GradeFilter = 'all' | 'definite' | 'probable' | 'possible' | 'weak';
type DateFilter = 'all' | '90d' | '30d';

type Props = {
  profiles: GlobalGraphProfile[];
};

const gradeRank: Record<string, number> = { definite: 4, probable: 3, possible: 2, weak: 1 };
const FIT_VIEW_OPTIONS = { padding: 0.22 };
const PRO_OPTIONS = { hideAttribution: true };
const NODE_TYPES = {};
const EDGE_TYPES = {};

function gradeLabel(grade: string | null | undefined) {
  if (grade === 'definite') return 'A';
  if (grade === 'probable') return 'B';
  if (grade === 'possible') return 'C';
  return 'D';
}

function gradeColor(grade: string | null | undefined) {
  if (grade === 'definite') return 'var(--success)';
  if (grade === 'probable') return 'var(--warning)';
  if (grade === 'possible') return 'var(--sev-possible)';
  return 'var(--sev-neutral)';
}

function profileName(profile: GlobalGraphProfile) {
  return `hash:${profile.id.slice(0, 10)}`;
}

function byDateFilter(profile: GlobalGraphProfile, filter: DateFilter, maxDate: Date) {
  if (filter === 'all') return true;
  const days = filter === '30d' ? 30 : 90;
  const cutoff = new Date(maxDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return new Date(profile.last_seen) >= cutoff;
}

function nodeStyle(profile: GlobalGraphProfile) {
  const grade = profile.identity_confidence_grade ?? 'weak';
  const color = gradeColor(grade);
  const intensity = gradeRank[grade] ?? 1;
  return {
    background: 'var(--surface)',
    border: `1px solid ${color}`,
    boxShadow: intensity >= 3 ? `0 14px 36px color-mix(in srgb, ${color} 22%, transparent)` : 'var(--shadow-1)',
    color: 'var(--text-primary)',
    borderRadius: 8,
    width: 172,
    padding: 0,
  };
}

export default function GlobalIdentityGraphClient({ profiles }: Props) {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [minMerchants, setMinMerchants] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(profiles[0]?.id ?? null);

  const maxDate = useMemo(() => {
    const latest = profiles.reduce((max, profile) => Math.max(max, new Date(profile.last_seen).getTime()), 0);
    return latest ? new Date(latest) : new Date();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(
      (profile) =>
        (gradeFilter === 'all' || profile.identity_confidence_grade === gradeFilter) &&
        profile.total_merchants_seen_at >= minMerchants &&
        byDateFilter(profile, dateFilter, maxDate),
    );
  }, [dateFilter, gradeFilter, maxDate, minMerchants, profiles]);

  const selectedProfile = filteredProfiles.find((profile) => profile.id === selectedId) ?? filteredProfiles[0] ?? null;
  const gated = filteredProfiles.length < 3;

  const { nodes, edges } = useMemo(() => {
    const centre: Node = {
      id: 'network',
      position: { x: 0, y: 0 },
      data: { label: 'Unauth network' },
      draggable: false,
      style: {
        width: 154,
        height: 64,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-xs)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    };

    const graphNodes = filteredProfiles.map((profile, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, filteredProfiles.length);
      const radius = 270 + (index % 3) * 80;
      const grade = profile.identity_confidence_grade ?? 'weak';
      const color = gradeColor(grade);
      return {
        id: profile.id,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * Math.max(190, radius * 0.72),
        },
        data: {
          label: (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {profileName(profile)}
                </span>
                <GradeBadge grade={gradeLabel(grade)} size="sm" compact />
              </div>
              <div className="truncate font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                {profile.total_merchants_seen_at} merchants · {profile.total_orders} orders
              </div>
              <div className="h-1 overflow-hidden rounded-sm" style={{ background: 'var(--surface-sunken)' }}>
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${Math.min(100, profile.risk_score)}%`, background: color }}
                />
              </div>
            </div>
          ),
        },
        style: nodeStyle(profile),
      } satisfies Node;
    });

    const graphEdges = filteredProfiles.map((profile) => {
      const grade = profile.identity_confidence_grade ?? 'weak';
      return {
        id: `network-${profile.id}`,
        source: 'network',
        target: profile.id,
        animated: grade === 'definite' || grade === 'probable',
        style: {
          stroke: gradeColor(grade),
          strokeOpacity: grade === 'weak' ? 0.36 : 0.68,
          strokeWidth: Math.max(1.5, Math.min(7, profile.total_merchants_seen_at + profile.risk_score / 28)),
        },
      } satisfies Edge;
    });

    return { nodes: [centre, ...graphNodes], edges: graphEdges };
  }, [filteredProfiles]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.id !== 'network') setSelectedId(node.id);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
      <aside className="rounded-md border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="t-label" style={{ color: 'var(--text-tertiary)' }}>Controls</p>
        <div className="mt-4 space-y-4">
          <div>
            <span className="t-label mb-2 block" style={{ color: 'var(--text-tertiary)' }}>Grade tier</span>
            <div className="grid grid-cols-2 gap-2">
              {(['all', 'definite', 'probable', 'possible', 'weak'] as GradeFilter[]).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setGradeFilter(grade)}
                  className="rounded-md border px-2 py-1.5 text-xs font-semibold uppercase transition-colors"
                  style={{
                    background: gradeFilter === grade ? 'var(--accent)' : 'var(--surface-sunken)',
                    borderColor: gradeFilter === grade ? 'var(--accent)' : 'var(--border)',
                    color: gradeFilter === grade ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="t-label mb-2 block" style={{ color: 'var(--text-tertiary)' }}>Date range</span>
            <div className="flex gap-2">
              {(['all', '90d', '30d'] as DateFilter[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateFilter(range)}
                  className="h-8 flex-1 rounded-md border text-xs font-semibold uppercase transition-colors"
                  style={{
                    background: dateFilter === range ? 'var(--accent)' : 'var(--surface-sunken)',
                    borderColor: dateFilter === range ? 'var(--accent)' : 'var(--border)',
                    color: dateFilter === range ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="t-label mb-2 block" htmlFor="merchant-span" style={{ color: 'var(--text-tertiary)' }}>
              Merchant span
            </label>
            <div className="flex items-center gap-2">
              {[2, 3, 4].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={minMerchants === value ? 'primary' : 'secondary'}
                  onClick={() => setMinMerchants(value)}
                >
                  {value}+
                </Button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="relative min-h-[520px] overflow-hidden rounded-md border" style={{ background: 'var(--surface-base)', borderColor: 'var(--border)' }}>
        {gated ? (
          <div className="flex h-[520px] items-center justify-center p-6 text-center">
            <div>
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Network intelligence is still growing.
              </p>
              <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
                As more merchants surface matching identities, linked cross-merchant patterns will appear here. Keep the nav entry in place so the graph is ready when density increases.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            minZoom={0.35}
            maxZoom={1.65}
            onNodeClick={handleNodeClick}
            nodesDraggable={false}
            proOptions={PRO_OPTIONS}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
          >
            <Background color="var(--border)" gap={26} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </section>

      <aside className="rounded-md border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="t-label" style={{ color: 'var(--text-tertiary)' }}>Selected node</p>
        {selectedProfile ? (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <GradeBadge grade={gradeLabel(selectedProfile.identity_confidence_grade)} size="sm" compact />
                <p className="truncate text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {profileName(selectedProfile)}
                </p>
                <PrivacyBadge value="Hashed" />
              </div>
              <p className="mt-1 truncate font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                {selectedProfile.id}
              </p>
            </div>

            <NetworkFootprint
              merchants={selectedProfile.total_merchants_seen_at}
              claims={selectedProfile.total_refund_claims}
              grade={gradeLabel(selectedProfile.identity_confidence_grade)}
              kSatisfied={selectedProfile.total_merchants_seen_at >= 3}
              variant="compact"
            />

            <dl className="grid grid-cols-2 gap-2">
              {[
                ['Merchants', selectedProfile.total_merchants_seen_at.toLocaleString()],
                ['Orders', selectedProfile.total_orders.toLocaleString()],
                ['Claims', selectedProfile.total_refund_claims.toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border p-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <dt className="t-label" style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="t-label mb-2" style={{ color: 'var(--text-tertiary)' }}>Identity signals</p>
              {(() => {
                const signals = Array.isArray(selectedProfile.identity_signals_summary)
                  ? selectedProfile.identity_signals_summary.slice(0, 5)
                  : [];
                if (signals.length === 0) {
                  return (
                    <div
                      className="rounded-md border px-3 py-3 text-caption"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)', background: 'var(--surface)' }}
                    >
                      No identity signals recorded for this cluster. Signal data appears after a network check is run against this profile.
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5">
                    {signals.map((signal) => (
                      <div
                        key={signal}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-caption"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: gradeColor(selectedProfile.identity_confidence_grade) }}
                        />
                        {signal.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="pt-1">
              <Link
                href={`/customers/${selectedProfile.id}`}
                className="inline-flex w-full items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'transparent' }}
              >
                Open customer profile →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-caption space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
            <p>Select a graph node to inspect its network footprint.</p>
            <p style={{ color: 'var(--text-tertiary)' }}>Nodes represent pseudonymous identity clusters. Edge weight reflects cross-merchant signal strength.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
