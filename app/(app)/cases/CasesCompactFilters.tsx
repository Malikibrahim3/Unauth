'use client';

import { useState } from 'react';
import { ListFilter } from 'lucide-react';
import Link from 'next/link';
import { Drawer, FilterChip } from '@/components/ui';
import type { ClaimsFilterTab } from './ClaimsPageView';
import { buildClaimsQueryString } from './claimsPageLogic';

type FilterOption = { key: string; value: string; label: string };

const TRUTH_FILTERS: FilterOption[] = [
  { key: 'evidence_posture', value: 'strong', label: 'Strong evidence' },
  { key: 'evidence_posture', value: 'contestable', label: 'Contestable evidence' },
  { key: 'evidence_posture', value: 'insufficient', label: 'Insufficient evidence' },
  { key: 'evidence_posture', value: 'unavailable', label: 'Evidence not assessable' },
];

const READINESS_FILTERS: FilterOption[] = [
  { key: 'claim_readiness', value: 'ready_to_submit', label: 'Ready to submit' },
  { key: 'claim_readiness', value: 'waiting_on_provider', label: 'Waiting on provider' },
  { key: 'claim_readiness', value: 'credited_unreconciled', label: 'Credited · unreconciled' },
  { key: 'claim_readiness', value: 'reconciled', label: 'Reconciled' },
];

const RESPONSIBILITY_FILTERS: FilterOption[] = [
  { key: 'responsibility', value: 'courier', label: 'Courier' },
  { key: 'responsibility', value: 'three_pl', label: '3PL' },
  { key: 'responsibility', value: 'merchant', label: 'Merchant' },
  { key: 'responsibility', value: 'unresolved', label: 'Unresolved' },
];

const DEADLINE_FILTERS: FilterOption[] = [
  { key: 'deadline', value: 'due', label: 'Deadline due' },
  { key: 'deadline', value: 'expired', label: 'Deadline expired' },
  { key: 'deadline', value: 'unavailable', label: 'Deadline unavailable' },
];

const OWNERSHIP_FILTERS: FilterOption[] = [
  { key: 'owner', value: 'me', label: 'Assigned to me' },
  { key: 'owner', value: 'unassigned', label: 'Unassigned' },
  { key: 'viewed', value: 'unread', label: 'New evidence' },
  { key: 'queue', value: 'snoozed', label: 'Deferred' },
  { key: 'queue', value: 'history', label: 'Recorded outcomes' },
];

function FilterGroup({
  title,
  description,
  options,
  sp,
  basePath,
}: {
  title: string;
  description: string;
  options: FilterOption[];
  sp: Record<string, string | undefined>;
  basePath: '/cases';
}) {
  return (
    <section>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={title}>
        {options.map(({ key, value, label }) => (
          <FilterChip
            key={`${key}-${value}`}
            href={`${basePath}${buildClaimsQueryString(sp, {
              [key]: sp[key] === value ? undefined : value,
              page: '1',
              selected: undefined,
            })}`}
            active={sp[key] === value}
          >
            {label}
          </FilterChip>
        ))}
      </nav>
    </section>
  );
}

export function CasesCompactFilters({
  scopeLabel,
  resultText,
  filterTabs,
  sp,
  basePath,
  activeFilterCount,
}: {
  scopeLabel: string;
  resultText: string;
  filterTabs: ClaimsFilterTab[];
  sp: Record<string, string | undefined>;
  basePath: '/cases';
  activeFilterCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ua-case-compact-filters">
      <button type="button" className="ua-case-compact-filters__trigger" onClick={() => setOpen(true)} aria-expanded={open}>
        <span><strong>{scopeLabel}</strong><small>{resultText}</small></span>
        <span><ListFilter size={16} aria-hidden="true" /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}</span>
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filter cases by work question"
        width="min(440px, 100vw)"
        overlayId="case-filter-drawer"
      >
        <div className="ua-case-compact-filters__body">
          <section>
            <div>
              <h3>What needs to happen?</h3>
              <p>Choose the stage of work you are responsible for now.</p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Case workflow filters">
              {filterTabs.filter((tab) => tab.coverage !== 'complete' || tab.count > 0 || tab.active).map((tab) => (
                <FilterChip key={tab.label} href={tab.href} active={tab.active} count={tab.coverage === 'complete' ? tab.count : undefined}>
                  {tab.label}
                </FilterChip>
              ))}
            </nav>
          </section>
          <FilterGroup title="Whose attention is needed?" description="Narrow by ownership, new evidence, or completed work." options={OWNERSHIP_FILTERS} sp={sp} basePath={basePath} />
          <FilterGroup title="Can the evidence support a decision?" description="Evidence posture describes source coverage, not the merchant outcome." options={TRUTH_FILTERS} sp={sp} basePath={basePath} />
          <FilterGroup title="Can recovery move forward?" description="Claim readiness stays separate from provider acceptance and money received." options={READINESS_FILTERS} sp={sp} basePath={basePath} />
          <FilterGroup title="Who may be responsible?" description="This is the recorded assessment state, not a customer decision." options={RESPONSIBILITY_FILTERS} sp={sp} basePath={basePath} />
          <FilterGroup title="Which deadlines need attention?" description="Unavailable dates remain distinct from dates that are not due." options={DEADLINE_FILTERS} sp={sp} basePath={basePath} />
          {activeFilterCount ? (
            <div className="ua-case-compact-filters__footer">
              <Link href={basePath} onClick={() => setOpen(false)}>Clear all filters</Link>
              <button type="button" onClick={() => setOpen(false)}>Show {resultText.toLowerCase()}</button>
            </div>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
