import { Activity, ShieldCheck } from 'lucide-react';
import CustomerNotes from '@/components/audit/CustomerNotes';
import CustomerSupportCasesSection from '@/components/customers/CustomerSupportCasesSection';
import IdentityChangesDisclosure from '@/components/customers/IdentityChangesDisclosure';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import { SectionCard } from '@/components/ui/SectionCard';
import { MetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PrivacyBadge } from '@/components/ui/PrivacyBadge';
import { labelFor } from '@/lib/copy/labels';
import { formatDate, formatDateMode } from '@/lib/utils/format';
import { FLAG_EXPERIENCE_POLISH_V1 } from '@/lib/flags';
import { labelize, type RoadmapTransaction } from '@/app/(app)/customers/[id]/customerProfilePageLabels';
import {
  ConfidencePill,
  IdentityDatum,
  RoadmapOrderCard,
} from '@/app/(app)/customers/[id]/CustomerProfilePageParts';
import type {
  ActivityLogEntry,
  CustomerProfileDisplay,
  LinkedAccountRow,
  MerchantSignalPill,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import type { BehaviorRoadmapEvent } from '@/components/customers/BehaviorRoadmap';

export type CustomerProfilePageMainColumnProps = {
  profile: CustomerProfileDisplay;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantOrderCount: number;
  merchantNarrative: string;
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel['identityTimeline'];
  variantCount: number;
  merchantSignalPills: MerchantSignalPill[];
  linkedAccounts: LinkedAccountRow[];
  activityLog: ActivityLogEntry[];
};

export function CustomerProfilePageMainColumn({
  profile,
  profileGrade,
  hasCleanRecord,
  merchantOrderCount,
  merchantNarrative,
  identitySignals,
  transactions,
  roadmapEvents,
  identityTimeline,
  variantCount,
  merchantSignalPills,
  linkedAccounts,
  activityLog,
}: CustomerProfilePageMainColumnProps) {
  return (
    <div className="min-w-0 space-y-[var(--space-5)]">
      {!hasCleanRecord && (
        <SectionCard title="Order & claim history" description="Chronological orders and claim events — use this narrative in your helpdesk reply.">
          <div className="mb-[var(--space-5)] rounded-lg border p-[var(--space-4)]" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{merchantNarrative}</p>
            </div>

            {identitySignals.length > 0 && (
              <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
                {identitySignals.map((flag) => (
                  <Badge key={flag} tone="neutral" variant="subtle" size="sm">{labelize(flag)}</Badge>
                ))}
              </div>
            )}
          </div>

          {transactions.length === 0 ? (
            <EmptyState title="No orders in dataset" description="No transactions found for this customer in the current dataset." />
          ) : FLAG_EXPERIENCE_POLISH_V1 ? (
            <>
              <BehaviorRoadmap events={roadmapEvents} />
              {identityTimeline.length > 0 && (
                <div className="mt-[var(--space-4)]">
                  <IdentityChangesDisclosure entries={identityTimeline} variantCount={variantCount} />
                </div>
              )}
            </>
          ) : (
            <ol>
              {transactions.map((tx, index) => (
                <RoadmapOrderCard key={tx.order_id} tx={tx} isLast={index === transactions.length - 1} />
              ))}
            </ol>
          )}
        </SectionCard>
      )}

      {hasCleanRecord && identityTimeline.length > 0 && (
        <IdentityChangesDisclosure entries={identityTimeline} variantCount={variantCount} />
      )}

      <SectionCard
        title="Network footprint"
        description={<span className="inline-flex items-center gap-2"><span>Privacy-safe cross-store context</span><PrivacyBadge /></span>}
      >
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Merchants" value={profile.total_merchants_seen_at ?? 1} density="compact" />
          <MetricCard label="Profile orders" value={profile.total_orders ?? merchantOrderCount} density="compact" />
          <MetricCard label="Privacy" value="Privacy-safe" density="compact" />
        </div>
        {merchantSignalPills.length === 0 ? (
          <EmptyState title="No merchant signals" description="No cross-merchant claim signals are available for this profile yet." />
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {merchantSignalPills.map((pill) => (
              <span
                key={`${pill.merchantLabel}-${pill.claimType}`}
                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs"
                style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                title="Cross-merchant signal summary"
              >
                <span className="font-semibold">{pill.merchantLabel}</span>
                <span>·</span>
                <span>{pill.claimType}</span>
                <span>·</span>
                <ConfidencePill grade={profileGrade} />
              </span>
            ))}
          </div>
        )}
        <p className="text-caption mt-3" style={{ color: 'var(--text-muted)' }}>
          Other merchant names, customer IDs, and order IDs are hidden; only aggregate presence is shown.
        </p>
      </SectionCard>

      <SectionCard title="Identity details">
        <dl className="space-y-4 text-body-sm">
          {profile.emails.length > 0 && (
            <IdentityDatum label={profile.emails.length > 1 ? labelFor('emails') : labelFor('email')}>
              {profile.emails.map((e) => (
                <p key={e} className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{e}</p>
              ))}
            </IdentityDatum>
          )}
          {profile.names.length > 0 && (
            <IdentityDatum label={profile.names.length > 1 ? labelFor('names') : labelFor('name')}>
              {profile.names.map((n) => (
                <p key={n} className="text-caption" style={{ color: 'var(--text)' }}>{n}</p>
              ))}
            </IdentityDatum>
          )}
          {profile.addresses.length > 0 && (
            <IdentityDatum label={profile.addresses.length > 1 ? labelFor('addresses') : labelFor('address')}>
              {profile.addresses.map((a) => (
                <p key={a} className="text-caption" style={{ color: 'var(--text)' }}>{a}</p>
              ))}
            </IdentityDatum>
          )}
          {profile.card_last4s.length > 0 && (
            <IdentityDatum label={labelFor('cards')}>
              <div className="flex flex-wrap gap-1.5">
                {profile.card_last4s.map((c) => (
                  <span key={c} className="font-mono text-caption px-1.5 py-0.5 rounded border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    •••• {c}
                  </span>
                ))}
              </div>
            </IdentityDatum>
          )}
          {profile.phones && profile.phones.length > 0 && (
            <IdentityDatum label={profile.phones.length > 1 ? labelFor('phones') : labelFor('phone')}>
              {profile.phones.map((p) => (
                <p key={p} className="font-mono text-caption" style={{ color: 'var(--text)' }}>{p}</p>
              ))}
            </IdentityDatum>
          )}
          {profile.ips && profile.ips.length > 0 && (
            <IdentityDatum label={profile.ips.length > 1 ? labelFor('ips') : labelFor('ip')}>
              {profile.ips.map((ip) => (
                <p key={ip} className="font-mono text-caption break-all" style={{ color: 'var(--text)' }}>{ip}</p>
              ))}
            </IdentityDatum>
          )}
        </dl>
      </SectionCard>

      <SectionCard title={`Linked identities (${linkedAccounts.length})`}>
        {linkedAccounts.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No linked identities yet. They appear when signals connect this profile to other customer records in your data or the network.
          </p>
        ) : (
          <ul className="space-y-2">
            {linkedAccounts.map((acc) => (
              <li key={`${acc.entityType}-${acc.entityValue}`} className="grid grid-cols-[minmax(0,1fr)_60px_36px] items-center gap-3">
                <div className="min-w-0">
                  <p className="t-label" style={{ color: 'var(--ink-tertiary)' }}>{labelize(acc.entityType)}</p>
                  <p className="t-caption truncate font-mono" style={{ color: 'var(--ink-secondary)' }}>{acc.entityValue}</p>
                </div>
                <div className="h-0.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
                  <div className="h-full" style={{ width: `${acc.confidence}%`, background: 'var(--copper-bright)' }} />
                </div>
                <span className="t-mono text-right" style={{ color: 'var(--ink-secondary)' }}>{acc.confidence}%</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CustomerSupportCasesSection profileId={profile.id} />

      <SectionCard title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </SectionCard>

      <SectionCard title="Activity">
        {activityLog.length === 0 ? (
          <EmptyState title="No activity yet" description="Actions and changes will appear here." />
        ) : (
          <ol className="space-y-3">
            {activityLog.map((entry) => {
              const d = entry.event_data;
              let description = '';
              switch (entry.event_type) {
                case 'profile_created': description = 'Profile created from audit'; break;
                case 'status_changed': description = `Status changed to ${d.to}`; break;
                case 'note_added': description = `Note added: ${d.note_preview ?? ''}`; break;
                case 'note_deleted': description = 'Note removed'; break;
                case 'watchlist_added': description = 'Legacy saved-case marker (retired)'; break;
                case 'watchlist_removed': description = 'Legacy saved-case marker removed (retired)'; break;
                case 'evidence_generated': description = `Evidence package generated (${d.reference_number})`; break;
                case 'audit_appearance': description = `Appeared in ${d.audit_label ?? 'an audit'} with ${d.score ?? ''} confidence`; break;
                case 'manually_reviewed': description = 'Marked as manually reviewed'; break;
                default: description = labelize(entry.event_type);
              }
              return (
                <li key={entry.id} className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-inset)' }}>
                  <Activity className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm" style={{ color: 'var(--text)' }}>{description}</p>
                    <p className="text-caption" style={{ color: 'var(--text-subtle)' }} title={formatDate(entry.created_at)}>{formatDateMode(entry.created_at, 'recent')}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
