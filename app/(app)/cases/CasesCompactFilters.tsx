'use client';

import { useCallback, useRef, useState } from 'react';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';
import Link from '@/components/navigation/AppNavLink';
import type { ClaimsFilterTab } from './ClaimsPageView';
import { buildClaimsQueryString } from './claimsPageLogic';

type FilterOption = { key: string; value: string; label: string };

function FilterGlyph() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.4 3.4h9.2L8 7.4v3.7L6 10V7.4Z"/></svg>; }
function OwnerGlyph() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="5" r="2.3"/><path d="M2.9 11.9c0-2.2 1.8-3.7 4.1-3.7s4.1 1.5 4.1 3.7"/></svg>; }
function ChevronGlyph() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4"/></svg>; }
function CloseGlyph() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7"/></svg>; }

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

const groupStyle = { display: 'flex', flexDirection: 'column', gap: 8 } as const;
const titleStyle = { margin: 0, color: '#1c1f23', font: "500 12px/1.35 'Inter',sans-serif" } as const;
const descriptionStyle = { margin: '2px 0 0', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" } as const;

function FilterGroup({ title, description, options, sp, basePath, close }: {
  title: string;
  description: string;
  options: FilterOption[];
  sp: Record<string, string | undefined>;
  basePath: '/cases';
  close: () => void;
}) {
  return (
    <section style={groupStyle}>
      <div><h3 style={titleStyle}>{title}</h3><p style={descriptionStyle}>{description}</p></div>
      <nav aria-label={title} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(({ key, value, label }) => {
          const active = sp[key] === value;
          return (
            <Link
              key={`${key}-${value}`}
              href={`${basePath}${buildClaimsQueryString(sp, { [key]: active ? undefined : value, page: '1', selected: undefined })}`}
              onClick={close}
              aria-current={active ? 'true' : undefined}
              style={{ padding: '6px 9px', borderRadius: 7, background: active ? '#1c1f23' : '#fff', color: active ? '#fff' : '#40454a', boxShadow: active ? 'none' : 'inset 0 0 0 1px rgba(28,27,25,.1)', font: "500 10.5px/1 'Inter',sans-serif", textDecoration: 'none' }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

export function CasesCompactFilters({ resultText, filterTabs, sp, basePath, activeFilterCount }: {
  resultText: string;
  filterTabs: ClaimsFilterTab[];
  sp: Record<string, string | undefined>;
  basePath: '/cases';
  activeFilterCount: number;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const opener = useRef<HTMLElement | null>(null);
  const { mounted, containerRef } = useOverlayPresence({ open, onClose: close, trapFocus: true, restoreFocus: true, restoreFocusTarget: opener, lockBodyScroll: true });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <button type="button" onClick={(event) => { opener.current = event.currentTarget; setOpen(true); }} aria-expanded={open} style={{ height: 31, display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', border: 0, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', background: '#fff', color: '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>
        <FilterGlyph/><span>Filters{activeFilterCount ? `: ${activeFilterCount}` : ''}</span><ChevronGlyph/>
      </button>
      <button type="button" onClick={(event) => { opener.current = event.currentTarget; setOpen(true); }} aria-expanded={open} style={{ height: 31, display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', border: 0, borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', background: '#fff', color: '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>
        <OwnerGlyph/><span>Owner: {sp.owner === 'me' ? 'me' : sp.owner === 'unassigned' ? 'unassigned' : 'anyone'}</span><ChevronGlyph/>
      </button>
      {mounted ? (
        <OverlayPortal><div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 80, pointerEvents: 'auto', background: 'rgba(28,27,25,.22)' }}>
          <div ref={(node) => { containerRef.current = node; }} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Filter cases" data-overlay-id="case-filter-drawer" style={{ position: 'absolute', top: 12, right: 12, bottom: 12, width: 'min(440px,calc(100vw - 24px))', padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 17, overflowY: 'auto', borderRadius: 12, background: '#fff', boxShadow: '0 18px 45px rgba(28,27,25,.18),0 0 0 1px rgba(28,27,25,.08)' }}>
            <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1 }}><div style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.06em' }}>FILTER CASES</div><h2 style={{ margin: '6px 0 0', color: '#1c1f23', font: "500 15px/1.3 'Inter',sans-serif" }}>Work questions</h2><p style={{ margin: '4px 0 0', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{resultText}</p></div><button type="button" onClick={close} aria-label="Close filters" style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 0, borderRadius: 7, background: '#f4f3f1', cursor: 'pointer' }}><CloseGlyph/></button></header>
            <section style={groupStyle}><div><h3 style={titleStyle}>What needs to happen?</h3><p style={descriptionStyle}>Choose the stage of work you are responsible for now.</p></div><nav aria-label="Case workflow filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{filterTabs.filter((tab) => tab.coverage !== 'complete' || tab.count > 0 || tab.active).map((tab) => <Link key={tab.label} href={tab.href} onClick={close} aria-current={tab.active ? 'page' : undefined} style={{ padding: '6px 9px', borderRadius: 7, background: tab.active ? '#1c1f23' : '#fff', color: tab.active ? '#fff' : '#40454a', boxShadow: tab.active ? 'none' : 'inset 0 0 0 1px rgba(28,27,25,.1)', font: "500 10.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>{tab.label}{tab.coverage === 'complete' ? ` · ${tab.count}` : ''}</Link>)}</nav></section>
            <FilterGroup title="Whose attention is needed?" description="Narrow by ownership, new evidence, or completed work." options={OWNERSHIP_FILTERS} sp={sp} basePath={basePath} close={close}/>
            <FilterGroup title="Can the evidence support a decision?" description="Evidence posture describes source coverage, not the merchant outcome." options={TRUTH_FILTERS} sp={sp} basePath={basePath} close={close}/>
            <FilterGroup title="Can recovery move forward?" description="Claim readiness stays separate from provider acceptance and money received." options={READINESS_FILTERS} sp={sp} basePath={basePath} close={close}/>
            <FilterGroup title="Who may be responsible?" description="This is the recorded assessment state, not a customer decision." options={RESPONSIBILITY_FILTERS} sp={sp} basePath={basePath} close={close}/>
            <FilterGroup title="Which deadlines need attention?" description="Unavailable dates remain distinct from dates that are not due." options={DEADLINE_FILTERS} sp={sp} basePath={basePath} close={close}/>
            {activeFilterCount ? <footer style={{ position: 'sticky', bottom: -16, margin: '0 -18px -16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #eae8e5', background: '#fff' }}><Link href={basePath} onClick={close} style={{ color: '#64686d', font: "500 11px/1 'Inter',sans-serif", textDecoration: 'none' }}>Clear all filters</Link><span style={{ flex: 1 }}/><button type="button" onClick={close} style={{ padding: '8px 11px', border: 0, borderRadius: 8, background: '#1c1f23', color: '#fff', font: "500 11.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Show {resultText.toLowerCase()}</button></footer> : null}
          </div>
        </div></OverlayPortal>
      ) : null}
    </div>
  );
}
