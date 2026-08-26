'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  DataTableServer,
  FilterChip,
  Input,
  MoneyValue,
  OperationalState,
  RegistrySurface,
  RegistryToolbar,
  StatusBadge,
  UnavailableValue,
} from '@/components/ui';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { CaseContextDrawer } from '@/components/cases/CaseContextDrawer';
import { formatDate } from '@/lib/utils/format';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import {
  RECOVERY_OWNER_LABELS,
  type RecoveryCase,
} from '@/lib/recoveries/types';
import { hashId, shortRef } from '@/lib/ui/displayRef';
import { RecoveryActionDialog } from '@/components/recoveries/RecoveryActionDialog';
import {
  RECOVERY_ACTIONS,
  recoveryActionAvailable,
  recoveryNextAction,
  type RecoveryActionOption,
} from '@/components/recoveries/recoveryActionOptions';

type Props = {
  recoveries: RecoveryCase[];
  canManage: boolean;
  financialPeriod?: {
    label: string;
    recoveryIds: string[];
    clearHref: string;
  } | null;
};

const FILTERS = [
  { key: 'all', label: 'All recoveries' },
  { key: 'evidence', label: 'Missing evidence' },
  { key: 'ready', label: 'Ready to submit' },
  { key: 'chase', label: 'Needs correspondence' },
  { key: 'outcome', label: 'Outcome recorded' },
  { key: 'closed', label: 'Closed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];
type FinancialFilterKey = 'financial-eligible' | 'financial-submitted' | 'financial-approved' | 'financial-recovered' | 'financial-outstanding';
type BoardFilterKey = FilterKey | FinancialFilterKey;

const FINANCIAL_FILTER_LABELS: Record<FinancialFilterKey, string> = {
  'financial-eligible': 'eligible / sought value',
  'financial-submitted': 'submitted value',
  'financial-approved': 'approved value',
  'financial-recovered': 'received / credited value',
  'financial-outstanding': 'outstanding value',
};

function matchesFilter(item: RecoveryCase, filter: BoardFilterKey) {
  if (filter === 'financial-eligible') return item.amount_sought_minor > 0;
  if (filter === 'financial-submitted') return ['submitted', 'waiting_response', 'chase_due', 'approved', 'partially_approved', 'rejected', 'appealed', 'paid'].includes(item.status);
  if (filter === 'financial-approved') return item.amount_approved_minor > 0;
  if (filter === 'financial-recovered') return item.amount_recovered_minor > 0;
  if (filter === 'financial-outstanding') return item.amount_sought_minor - item.amount_recovered_minor - item.amount_written_off_minor > 0;
  if (filter === 'all') return true;
  if (filter === 'evidence') return item.status === 'evidence_needed' || item.evidence_missing.length > 0;
  if (filter === 'ready') return item.status === 'ready_to_submit';
  if (filter === 'chase') return ['submitted', 'waiting_response', 'chase_due'].includes(item.status);
  if (filter === 'outcome') return ['approved', 'partially_approved', 'rejected', 'appealed'].includes(item.status);
  return ['paid', 'closed_unrecoverable'].includes(item.status);
}

function displayDeadline(value: string | null) {
  return value ? formatDate(value) : null;
}

export function RecoveryBoardClient({ recoveries, canManage, financialPeriod = null }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get('stage');
  const financialFilter = requestedFilter && requestedFilter in FINANCIAL_FILTER_LABELS ? requestedFilter as FinancialFilterKey : null;
  const initialFilter = FILTERS.some((item) => item.key === requestedFilter) ? requestedFilter as FilterKey : financialFilter ?? 'all';
  const requestedSearch = searchParams.get('search') ?? '';
  const [filter, setFilter] = useState<BoardFilterKey>(initialFilter);
  const [query, setQuery] = useState(requestedSearch);
  const [rowOverrides, setRowOverrides] = useState<Record<string, RecoveryCase>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<{ item: RecoveryCase; option: RecoveryActionOption } | null>(null);

  const rowsState = recoveries.map((row) => rowOverrides[row.id] ?? row);
  const ownerOptions = [...new Set(rowsState.map((item) => item.owner_type))].sort();
  const sourceOptions = [...new Map(rowsState.map((item) => [item.partner?.id ?? 'unavailable', item.partner?.name ?? 'Source unavailable'])).entries()].sort((left, right) => left[1].localeCompare(right[1]));
  const requestedOwner = searchParams.get('owner');
  const owner = requestedOwner && ownerOptions.includes(requestedOwner as RecoveryCase['owner_type']) ? requestedOwner : null;
  const requestedSource = searchParams.get('source');
  const source = requestedSource && sourceOptions.some(([key]) => key === requestedSource) ? requestedSource : null;
  const selectedRecovery = rowsState.find((item) => item.id === searchParams.get('selected')) ?? null;
  useEffect(() => setFilter(initialFilter), [initialFilter]);
  useEffect(() => setQuery(requestedSearch), [requestedSearch]);
  const visibleRows = (() => {
    const normalized = query.trim().toLowerCase();
    return rowsState.filter((item) => {
      if (financialPeriod && !financialPeriod.recoveryIds.includes(item.id)) return false;
      if (!matchesFilter(item, filter)) return false;
      if (owner && item.owner_type !== owner) return false;
      if (source && (item.partner?.id ?? 'unavailable') !== source) return false;
      if (!normalized) return true;
      const searchable = [
        item.id,
        item.partner?.name,
        RECOVERY_OWNER_LABELS[item.owner_type],
        RECOVERY_TYPE_LABELS[item.recovery_type],
        item.support_payout_case?.order_number,
        item.support_payout_case?.ticket_external_id,
        item.support_payout_case_id,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(normalized);
    });
  })();

  function updateLocation(input: { stage?: BoardFilterKey | null; query?: string | null; owner?: string | null; source?: string | null; selected?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if ('stage' in input) {
      if (!input.stage || input.stage === 'all') params.delete('stage'); else params.set('stage', input.stage);
    }
    if ('query' in input) {
      if (input.query?.trim()) params.set('search', input.query.trim()); else params.delete('search');
    }
    if ('owner' in input) {
      if (input.owner) params.set('owner', input.owner); else params.delete('owner');
    }
    if ('source' in input) {
      if (input.source) params.set('source', input.source); else params.delete('source');
    }
    if ('selected' in input) {
      if (input.selected) params.set('selected', input.selected); else params.delete('selected');
    }
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  function openAction(item: RecoveryCase, option: RecoveryActionOption) {
    setMessage(null);
    setPending({ item, option });
  }

  const columns = [
    {
      key: 'recovery',
      header: 'Recovery',
      width: '180px',
      render: (item: RecoveryCase) => (
        <span className="flex min-w-0 flex-col gap-1">
          <Link href={`/financials/recovery/${item.id}`} className="ua-text-working-title text-[var(--uo-route-text-primary)] hover:text-[var(--uo-route-action-primary)]">Recovery {hashId(item.id)}</Link>
          <span className="ua-text-metadata">{RECOVERY_TYPE_LABELS[item.recovery_type]}</span>
        </span>
      ),
    },
    {
      key: 'partner',
      header: 'Partner / owner',
      render: (item: RecoveryCase) => <span className="ua-text-dense">{item.partner?.name ?? RECOVERY_OWNER_LABELS[item.owner_type]}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      kind: 'status' as const,
      render: (item: RecoveryCase) => <StatusBadge family="recoveryStatus" value={item.status} size="sm" />,
    },
    {
      key: 'case',
      header: 'Case',
      render: (item: RecoveryCase) => (
        <button type="button" className="ua-text-label text-left text-[var(--uo-route-action-primary)] underline underline-offset-2" onClick={() => updateLocation({ selected: item.id })}>
          {item.support_payout_case?.order_number ?? item.support_payout_case?.ticket_external_id ?? shortRef(null, item.support_payout_case_id)}
        </button>
      ),
    },
    {
      key: 'sought',
      header: 'Sought',
      kind: 'currency' as const,
      render: (item: RecoveryCase) => <MoneyValue minorUnits={item.amount_sought_minor} currency={item.currency} />,
    },
    {
      key: 'recovered',
      header: 'Recovered',
      kind: 'currency' as const,
      render: (item: RecoveryCase) => <MoneyValue minorUnits={item.amount_recovered_minor} currency={item.currency} />,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      kind: 'currency' as const,
      render: (item: RecoveryCase) => <MoneyValue minorUnits={Math.max(0, item.amount_sought_minor - item.amount_recovered_minor - item.amount_written_off_minor)} currency={item.currency} />,
    },
    {
      key: 'evidence',
      header: 'Evidence / source',
      render: (item: RecoveryCase) => (
        <span className="flex min-w-0 flex-col gap-1">
          <span className="ua-text-dense">{item.evidence_complete ? 'Complete' : `${item.evidence_missing.length} missing`}</span>
          <span className="ua-text-metadata">{item.last_source_event_at ? `Source ${formatDate(item.last_source_event_at)}` : 'Source update unavailable'}</span>
        </span>
      ),
    },
    {
      key: 'deadline',
      header: 'Deadline',
      kind: 'date' as const,
      render: (item: RecoveryCase) => displayDeadline(item.deadline_at) ?? <UnavailableValue reason="No partner deadline is recorded" />,
    },
    {
      key: 'next',
      header: 'Next action',
      width: '220px',
      render: (item: RecoveryCase) => {
        const applicable = RECOVERY_ACTIONS.filter((option) => recoveryActionAvailable(item, option));
        const [primary, ...rest] = applicable;
        return (
          <span className="flex min-w-[190px] items-center justify-between gap-2">
            <span className="ua-text-dense text-[var(--uo-route-text-secondary)]">{recoveryNextAction(item)}</span>
            {canManage && primary ? (
              <span className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="secondary" disabled={pending?.item.id === item.id} onClick={() => openAction(item, primary)}>{primary.label}</Button>
                {rest.length ? <RowActionsMenu label="More recovery actions" actions={rest.map((option) => ({ label: option.label, tone: ['rejected', 'closed_unrecoverable'].includes(option.action) ? 'danger' : 'default', onSelect: () => openAction(item, option) }))} /> : null}
              </span>
            ) : null}
          </span>
        );
      },
    },
  ];

  return (
    <>
      {financialPeriod ? (
        <div className="ua-text-body mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-accent-soft)] px-3 py-2 text-[var(--uo-route-text-secondary)]" role="status">
          <span>Showing {financialPeriod.recoveryIds.length} {financialPeriod.recoveryIds.length === 1 ? 'recovery' : 'recoveries'} supporting {financialPeriod.label}.</span>
          <Link href={financialPeriod.clearHref} className="ua-text-label text-[var(--uo-route-action-primary)] underline underline-offset-2">Clear period</Link>
        </div>
      ) : null}
      {filter in FINANCIAL_FILTER_LABELS ? (
        <div className="ua-text-body mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-accent-soft)] px-3 py-2 text-[var(--uo-route-text-secondary)]" role="status">
          <span>Showing records that support {(FINANCIAL_FILTER_LABELS as Record<string, string>)[filter]}.</span>
          <button type="button" onClick={() => { setFilter('all'); updateLocation({ stage: null }); }} className="ua-text-label text-[var(--uo-route-action-primary)] underline underline-offset-2">Clear financial cohort</button>
        </div>
      ) : null}
      {message && !pending ? <p role="status" className="ua-text-body mb-3 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)] px-3 py-2 text-[var(--uo-route-text-secondary)]">{message}</p> : null}
      <RegistrySurface
        aria-label="Recovery operations"
        persistentTable
        toolbar={
          <RegistryToolbar
            search={<Input aria-label="Search recoveries" placeholder="Search recovery, partner or case" value={query} onChange={(event) => { setQuery(event.target.value); updateLocation({ query: event.target.value }); }} />}
            filters={(
              <div className="grid min-w-0 gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1"><span className="ua-text-metadata mr-1">Stage</span>{FILTERS.map((item) => <FilterChip key={item.key} active={filter === item.key} onClick={() => { setFilter(item.key); updateLocation({ stage: item.key }); }}>{item.label}</FilterChip>)}</div>
                <div className="flex min-w-0 flex-wrap items-center gap-1"><span className="ua-text-metadata mr-1">Owner</span><FilterChip active={!owner} onClick={() => updateLocation({ owner: null })}>All owners</FilterChip>{ownerOptions.map((item) => <FilterChip key={item} active={owner === item} onClick={() => updateLocation({ owner: item })}>{RECOVERY_OWNER_LABELS[item]}</FilterChip>)}</div>
                <div className="flex min-w-0 flex-wrap items-center gap-1"><span className="ua-text-metadata mr-1">Source</span><FilterChip active={!source} onClick={() => updateLocation({ source: null })}>All sources</FilterChip>{sourceOptions.map(([key, sourceLabel]) => <FilterChip key={key} active={source === key} onClick={() => updateLocation({ source: key })}>{sourceLabel}</FilterChip>)}</div>
              </div>
            )}
          />
        }
        resultCount={`${visibleRows.length} of ${rowsState.length} recoveries`}
      >
        {recoveries.length === 0 ? (
          <div data-state-id="recovery-board-empty-state">
            <OperationalState
              kind="empty"
              title="No source-backed recoveries yet"
              description="A recovery appears only after a viable loss has an evidence-backed recovery route. Connect sources or review an eligible case to start the handoff."
              action={<Link href="/sources/connected" className="ua-text-working-title text-[var(--uo-route-action-primary)] underline underline-offset-2">Review connected sources</Link>}
            />
          </div>
        ) : (
          <DataTableServer
            flush
            persistentHeader
            density="two-line"
            aria-label="Recovery ledger"
            rows={visibleRows}
            columns={columns}
            getRowKey={(item) => item.id}
            emptyState={
              <div data-state-id="recovery-board-no-result">
                <OperationalState kind="filtered-empty" title="No recoveries match these controls" description="Clear the search or choose another operational stage. No recovery records were changed." />
              </div>
            }
          />
        )}
      </RegistrySurface>

      {selectedRecovery ? <CaseContextDrawer caseId={selectedRecovery.support_payout_case_id} onClose={() => updateLocation({ selected: null })} /> : null}

      <RecoveryActionDialog
        item={pending?.item ?? null}
        option={pending?.option ?? null}
        open={pending != null}
        overlayId="confirm-recovery-action-modal"
        onClose={() => setPending(null)}
        onRecorded={(updated, successMessage) => {
          setRowOverrides((current) => ({ ...current, [updated.id]: updated }));
          setPending(null);
          setMessage(successMessage);
        }}
      />
    </>
  );
}
