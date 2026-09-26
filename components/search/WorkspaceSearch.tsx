'use client';

import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { fetchSearchResults, SearchPermissionError } from '@/components/layout/commandPaletteFetch';
import type { UnifiedResult } from '@/components/layout/commandPaletteReducer';
import { searchTypeLabel } from './SearchResultIcon';
import type { Permission } from '@/lib/permissions';
import { getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import { allowedSearchApiTypes, canSearchResultType, type SearchApiType, type SearchResultType } from '@/lib/search/access';
import { formatNumber } from '@/lib/utils/format';

type SearchTab = 'everything' | 'case' | 'order' | 'customer' | 'ticket' | 'claims';
type SearchSource = 'all' | 'shopify' | 'gorgias' | 'shipbob' | 'ups' | 'manual';
type SearchStatus = 'initial' | 'minimum' | 'loading' | 'ready' | 'empty' | 'denied' | 'error';

const tabs: Array<{ value: SearchTab; label: string; types: SearchApiType[]; resultType?: SearchResultType }> = [
  { value: 'everything', label: 'Everything', types: ['customers', 'orders', 'cases', 'tickets', 'shipments', 'refunds', 'returns', 'disputes', 'losses', 'recoveries'] },
  { value: 'case', label: 'Cases', types: ['cases'], resultType: 'case' },
  { value: 'order', label: 'Orders', types: ['orders'], resultType: 'order' },
  { value: 'customer', label: 'Customers', types: ['customers'], resultType: 'customer' },
  { value: 'ticket', label: 'Tickets', types: ['tickets'], resultType: 'ticket' },
  { value: 'claims', label: 'Claims', types: ['losses', 'recoveries'] },
];

const sourceLabels: Record<string, string> = {
  all: 'All sources', shopify: 'Shopify', gorgias: 'Gorgias', shipbob: 'ShipBob', ups: 'UPS', manual: 'Manual',
  customers: 'Customer records', orders: 'Order records', cases: 'Case records', tickets: 'Support tickets',
  shipments: 'Shipment records', refunds: 'Refund records', returns: 'Return records', disputes: 'Dispute records',
  losses: 'Loss records', recoveries: 'Recovery records', workspace: 'Unauth records',
};

const shadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';
const sectionHeading: CSSProperties = { color: '#64686d', letterSpacing: '.09em', font: "600 10.5px/1 'Inter',sans-serif" };
const railCard: CSSProperties = { background: '#fff', borderRadius: 10, boxShadow: shadow, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9 };

function normalizeTab(value?: string): SearchTab {
  if (value === 'all') return 'everything';
  if (value === 'recovery' || value === 'loss') return 'claims';
  return tabs.some((tab) => tab.value === value) ? value as SearchTab : 'everything';
}

function normalizeSource(value?: string): SearchSource {
  return value === 'shopify' || value === 'gorgias' || value === 'shipbob' || value === 'ups' || value === 'manual' ? value : 'all';
}

function tabPermitted(tab: (typeof tabs)[number], permissions: ReadonlySet<Permission>) {
  if (tab.value === 'everything') return true;
  if (tab.value === 'claims') return canSearchResultType('loss', permissions) || canSearchResultType('recovery', permissions);
  return tab.resultType ? canSearchResultType(tab.resultType, permissions) : false;
}

function searchHref(query: string, tab: SearchTab, source: SearchSource, cursor: string | null) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (tab !== 'everything') params.set('type', tab);
  if (source !== 'all') params.set('source', source);
  if (cursor) params.set('cursor', cursor);
  return `/search${params.size ? `?${params}` : ''}`;
}

function moveSearchResultFocus(event: KeyboardEvent<HTMLAnchorElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const region = event.currentTarget.closest('#workspace-search-results');
  const results = region ? [...region.querySelectorAll<HTMLAnchorElement>('[data-search-result]')] : [];
  if (!results.length) return;
  const current = results.indexOf(event.currentTarget);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? results.length - 1 : event.key === 'ArrowDown' ? Math.min(results.length - 1, current + 1) : Math.max(0, current - 1);
  event.preventDefault();
  results[next]?.focus();
}

function groupFor(type: SearchResultType) {
  if (type === 'customer') return 'CUSTOMERS';
  if (type === 'case') return 'CASES';
  if (type === 'order' || type === 'shipment' || type === 'refund' || type === 'return' || type === 'dispute') return 'ORDERS';
  if (type === 'ticket') return 'TICKETS';
  return 'CLAIMS AND LOSSES';
}

const groupOrder = ['CUSTOMERS', 'CASES', 'ORDERS', 'TICKETS', 'CLAIMS AND LOSSES'];

export function WorkspaceSearch({ initialQuery = '', initialType, initialSource, initialCursor = null, permissions = [] }: {
  initialQuery?: string;
  initialType?: string;
  initialSource?: string;
  initialCursor?: string | null;
  permissions?: Permission[];
}) {
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const permittedDestinationCount = useMemo(() => getCommandPaletteNavItems(permissionSet).length, [permissionSet]);
  const allowedApiTypes = useMemo(() => allowedSearchApiTypes(permissionSet), [permissionSet]);
  // Native history updates can restore a cached RSC tree whose initial props
  // predate the search. The current URL owns the query and filters on return.
  const searchParams = useSearchParams();
  const query = (searchParams ? searchParams.get('q') ?? '' : initialQuery).slice(0, 120);
  const requestedTab = normalizeTab(searchParams ? searchParams.get('type') ?? undefined : initialType);
  const candidate = tabs.find((tab) => tab.value === requestedTab) ?? tabs[0]!;
  const activeTab: SearchTab = tabPermitted(candidate, permissionSet) ? candidate.value : 'everything';
  const source = normalizeSource(searchParams ? searchParams.get('source') ?? undefined : initialSource);
  const cursor = searchParams ? searchParams.get('cursor') : initialCursor;
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([cursor]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);
  const [coverageState, setCoverageState] = useState<'complete' | 'partial'>('complete');
  const [sourcesAnswered, setSourcesAnswered] = useState<string[]>([]);
  const [sourcesFailed, setSourcesFailed] = useState<string[]>([]);
  const [restrictedTypes, setRestrictedTypes] = useState<string[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [status, setStatus] = useState<SearchStatus>(query.length >= 2 ? 'loading' : 'initial');
  const generation = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    replaceHistoryUrlIfChanged(searchHref(query, activeTab, source, cursor));
  }, [activeTab, cursor, query, source]);

  useEffect(() => {
    const trimmed = query.trim();
    const token = ++generation.current;
    let cancelled = false;
    if (!trimmed || trimmed.length < 2 || !allowedApiTypes.length) {
      setResults([]); setTotal(null); setReturnedCount(0); setCoverageState('complete'); setSourcesAnswered([]); setSourcesFailed([]); setRestrictedTypes([]); setNextCursor(null);
      setStatus(!trimmed ? 'initial' : trimmed.length < 2 ? 'minimum' : 'denied');
      return;
    }
    const selected = tabs.find((tab) => tab.value === activeTab) ?? tabs[0]!;
    setResults([]); setTotal(null); setSourcesAnswered([]); setSourcesFailed([]); setRestrictedTypes([]);
    setStatus('loading');
    const timer = window.setTimeout(() => {
      void fetchSearchResults(trimmed, { types: selected.types, limit: 20, type: selected.resultType, source, cursor }).then((response) => {
        if (cancelled || token !== generation.current) return;
        setResults(response.unifiedResults); setTotal(response.total); setReturnedCount(response.returnedCount); setCoverageState(response.coverage);
        setSourcesAnswered(response.sourcesAnswered); setSourcesFailed(response.sourcesFailed); setRestrictedTypes(response.restrictedTypes); setNextCursor(response.nextCursor);
        setStatus(response.unifiedResults.length ? 'ready' : 'empty');
      }).catch((reason: unknown) => {
        if (cancelled || token !== generation.current) return;
        setResults([]); setTotal(null); setReturnedCount(0); setCoverageState('complete'); setSourcesAnswered([]); setSourcesFailed([]); setRestrictedTypes([]); setNextCursor(null);
        setStatus(reason instanceof SearchPermissionError ? 'denied' : 'error');
      });
    }, 240);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeTab, allowedApiTypes.length, cursor, query, retryToken, source]);

  const availableTabs = tabs.filter((tab) => tabPermitted(tab, permissionSet));
  const groups = groupOrder.map((label) => ({ label, items: results.filter((item) => groupFor(item.type) === label) })).filter((group) => group.items.length);
  const direct = {
    order: results.find((item) => item.type === 'order'),
    case: results.find((item) => item.type === 'case'),
    claim: results.find((item) => item.type === 'recovery' || item.type === 'loss'),
    customer: results.find((item) => item.type === 'customer'),
  };

  function resetCursor() { setCursorHistory([null]); setPageIndex(0); setNextCursor(null); }
  function updateQuery(value: string) { resetCursor(); replaceHistoryUrlIfChanged(searchHref(value.slice(0, 120), activeTab, source, null)); }
  function updateTab(value: SearchTab) { resetCursor(); replaceHistoryUrlIfChanged(searchHref(query, value, source, null)); }
  function goNext() { if (!nextCursor) return; setCursorHistory((history) => [...history.slice(0, pageIndex + 1), nextCursor]); setPageIndex((value) => value + 1); replaceHistoryUrlIfChanged(searchHref(query, activeTab, source, nextCursor)); }
  function goPrevious() { if (pageIndex <= 0) return; setPageIndex((value) => Math.max(0, value - 1)); replaceHistoryUrlIfChanged(searchHref(query, activeTab, source, cursorHistory[pageIndex - 1] ?? null)); }

  const countCopy = status === 'loading' ? '…' : !['ready', 'empty'].includes(status) ? '—' : total == null ? formatNumber(returnedCount) : formatNumber(total);
  return <>
    <SetBreadcrumbLabel label={query.trim() || 'Search records'} detail={status === 'loading' ? 'Searching…' : status === 'error' || status === 'denied' ? 'Search results unavailable' : status === 'initial' || status === 'minimum' ? 'No search has run yet' : `${countCopy} ${total == null ? 'returned records' : 'matching records'} · ${coverageState} coverage`} />
    <h1 data-reference-ignore="accessibility-heading" className="sr-only">Search</h1>
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
      <div style={{ flex: 1, maxWidth: 520, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="6.2" cy="6.2" r="4.2"/><path d="M9.4 9.4 12 12"/></svg>
        <label htmlFor="workspace-search" className="sr-only">Search workspace records</label>
        <input ref={inputRef} id="workspace-search" value={query} onChange={(event) => updateQuery(event.target.value)} onKeyDown={(event) => { if (event.key !== 'ArrowDown' || status !== 'ready') return; const first = document.querySelector<HTMLAnchorElement>('#workspace-search-results [data-search-result]'); if (first) { event.preventDefault(); first.focus(); } }} autoFocus autoComplete="off" placeholder="Search cases, customers, orders" aria-controls="workspace-search-results" style={{ flex: 1, minWidth: 0, padding: 0, border: 0, outline: 0, background: 'transparent', color: '#1c1f23', font: "400 13px/1.2 'Inter',sans-serif" }}/>
        {query ? <button type="button" aria-label="Clear search" onClick={() => { updateQuery(''); inputRef.current?.focus(); }} style={{ width: 18, height: 18, padding: 2, border: 0, background: 'transparent', color: '#64686d', cursor: 'pointer' }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="m3.5 3.5 7 7M10.5 3.5l-7 7"/></svg></button> : null}
        <span style={{ color: '#64686d', font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>{countCopy}</span>
      </div>
      <div role="tablist" aria-label="Search result types" style={{ display: 'contents' }}>{availableTabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={activeTab === tab.value} onClick={() => updateTab(tab.value)} style={{ padding: '6px 11px', border: 0, borderRadius: 8, background: activeTab === tab.value ? '#1c1f23' : '#fff', boxShadow: activeTab === tab.value ? 'none' : 'inset 0 0 0 1px rgba(28,27,25,.1)', color: activeTab === tab.value ? '#fff' : '#40454a', font: `${activeTab === tab.value ? 500 : 400} 12px/1 'Inter',sans-serif`, cursor: 'pointer' }}>{tab.label}</button>)}</div>
    </div>

    <div data-screen-label="Search" data-visual-world="supplied-package" data-surface-id="search-route" data-operations-surface="search" data-state-id={status === 'initial' ? 'search-empty' : status === 'empty' ? 'search-no-results' : status === 'error' ? 'search-error' : undefined} data-search-status={status} data-permitted-destinations={permittedDestinationCount} style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14 }}>
      <div id="workspace-search-results" style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', padding: 1 }}>
        {status === 'loading' ? <LoadingSearch/> : null}
        {status === 'ready' ? groups.map((group) => <ResultGroup key={group.label} label={group.label} items={group.items} inputRef={inputRef}/>) : null}
        {status === 'initial' ? <SearchState title="Search the operating record" body="Use a name, email, source reference, tracking number or record ID."/> : null}
        {status === 'minimum' ? <SearchState title="Keep typing" body="Enter at least two characters to search workspace records."/> : null}
        {status === 'empty' ? <SearchState title="No match in this search scope" body={`No permitted canonical record matched “${query.trim()}” for ${sourceLabels[source].toLowerCase()}.`}/> : null}
        {status === 'denied' ? <SearchState title="Workspace records are restricted" body="Your current role does not include workspace entity search."/> : null}
        {status === 'error' ? <SearchState title="Workspace search is unavailable" body="The server could not return exact, merchant-scoped results. No partial count is shown." action={<button type="button" onClick={() => setRetryToken((value) => value + 1)} style={quietButton}>Try again</button>}/> : null}
        {coverageState === 'partial' || sourcesFailed.length ? <div style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: '#c98a1a' }}/><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{sourcesFailed.length ? `${sourcesFailed.map(sourceName).join(', ')} could not be searched` : 'Only part of the operating record answered'}</div><div style={{ marginTop: 2, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>There may be matching records outside this list. The count is what the responding sources returned, not what necessarily exists.</div></div><Link href="/sources/connected" style={{ flex: 'none', color: '#9b470d', textDecoration: 'none', font: "500 11.5px/1.5 'Inter',sans-serif" }}>Repair the source</Link></div> : null}
        {pageIndex > 0 || nextCursor ? <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}><button type="button" aria-label="Previous search page" disabled={pageIndex <= 0} onClick={goPrevious} style={pagerButton}>←</button><button type="button" aria-label="Next search page" disabled={!nextCursor} onClick={goNext} style={pagerButton}>→</button></div> : null}
      </div>

      <aside style={{ width: 300, flex: 'none', padding: '12px 13px', borderRadius: 13, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={sectionHeading}>WHICH SOURCES ANSWERED</div>
        <div style={railCard}>{status === 'initial' || status === 'minimum' ? <RailCopy>No search has run yet.</RailCopy> : [...new Set([...sourcesAnswered, ...sourcesFailed])].length ? [...new Set([...sourcesAnswered, ...sourcesFailed])].map((value) => { const failed = sourcesFailed.includes(value); return <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: failed ? '#b0431a' : '#1a6b43' }}/><span style={{ flex: 1, color: '#40454a', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{sourceName(value)}</span><span style={{ color: failed ? '#b0431a' : '#1a6b43', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{failed ? 'no response' : 'answered'}</span></div>; }) : <RailCopy>{status === 'loading' ? 'Waiting for source responses…' : status === 'error' || status === 'denied' ? 'Source response status is unavailable.' : 'The permitted workspace index answered atomically.'}</RailCopy>}</div>
        <div style={sectionHeading}>NOT SEARCHED</div>
        <div style={{ ...railCard, gap: 8 }}><RailCopy>Case notes and internal comments are excluded on purpose. Private collaboration is not part of workspace entity search.</RailCopy><div style={{ paddingTop: 8, borderTop: '1px solid #f4f2ef' }}><RailCopy>{restrictedTypes.length ? `${formatNumber(restrictedTypes.length)} record ${restrictedTypes.length === 1 ? 'family is' : 'families are'} hidden for your role: ${restrictedTypes.map(sourceName).join(', ')}.` : !['ready', 'empty'].includes(status) ? 'Permission coverage is not yet available for this search.' : 'No additional record family was reported as permission-restricted for this search.'}</RailCopy></div></div>
        <div style={sectionHeading}>GO STRAIGHT THERE</div>
        <div style={{ ...railCard, gap: 8 }}><DirectRow label="An order number" absence={status === 'loading' || status === 'initial' || status === 'minimum' ? 'Awaiting search' : status === 'error' || status === 'denied' ? 'Unavailable' : 'No match'} item={direct.order}/><DirectRow label="A case" absence={status === 'loading' || status === 'initial' || status === 'minimum' ? 'Awaiting search' : status === 'error' || status === 'denied' ? 'Unavailable' : 'No match'} item={direct.case}/><DirectRow label="A claim" absence={status === 'loading' || status === 'initial' || status === 'minimum' ? 'Awaiting search' : status === 'error' || status === 'denied' ? 'Unavailable' : 'No match'} item={direct.claim}/><DirectRow label="An email address" absence={status === 'loading' || status === 'initial' || status === 'minimum' ? 'Awaiting search' : status === 'error' || status === 'denied' ? 'Unavailable' : 'No match'} item={direct.customer} customer/></div>
        <span style={{ flex: 1 }}/><div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>⌘K does the same thing without leaving the page.</div>
      </aside>
    </div>
  </>;
}

const card: CSSProperties = { background: '#fff', borderRadius: 10, boxShadow: shadow };
const quietButton: CSSProperties = { padding: '7px 11px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "500 11.5px/1 'Inter',sans-serif", cursor: 'pointer' };
const pagerButton: CSSProperties = { width: 27, height: 27, border: 0, borderRadius: 7, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a' };

function sourceName(value: string) { return sourceLabels[value.toLowerCase()] ?? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function ResultGroup({ label, items, inputRef }: { label: string; items: UnifiedResult[]; inputRef: RefObject<HTMLInputElement | null> }) {
  return <section style={{ ...card, padding: '11px 16px 9px', flex: 'none' }}><div style={{ display: 'flex', alignItems: 'baseline', gap: 9, paddingBottom: 6 }}><span style={sectionHeading}>{label}</span><span style={{ color: '#64686d', font: "400 10px/1 'IBM Plex Mono',monospace" }}>{formatNumber(items.length)} {items.length === 1 ? 'match' : 'matches'}</span></div>{items.map((item) => <div key={`${item.type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><Link href={item.href} data-search-result onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); inputRef.current?.focus(); } else moveSearchResultFocus(event); }} style={{ width: 104, flex: 'none', color: '#9b470d', textDecoration: 'none', font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{item.id}</Link><span style={{ flex: 1, minWidth: 0, color: '#1c1f23', font: "400 12px/1.4 'Inter',sans-serif" }}>{item.label}</span><span style={{ width: 230, flex: 'none', color: '#64686d', font: "400 11px/1.4 'Inter',sans-serif" }}>{item.sublabel ?? `${searchTypeLabel(item.type)} record`}</span><span style={{ width: 110, flex: 'none', overflow: 'hidden', textAlign: 'right', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#40454a', font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{sourceName(item.source ?? 'workspace')}</span></div>)}</section>;
}

function SearchState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div style={{ ...card, minHeight: 260, display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 8, padding: 24, textAlign: 'center' }}><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="9.5" cy="9.5" r="6.1"/><path d="m14 14 4.2 4.2"/></svg><h2 style={{ margin: 0, color: '#1c1f23', font: "500 14px/1.4 'Inter',sans-serif" }}>{title}</h2><p style={{ maxWidth: 420, margin: 0, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{body}</p>{action}</div>;
}

function LoadingSearch() { return <div aria-label="Searching workspace records" role="status" style={{ ...card, display: 'grid', gap: 9, padding: 16 }}>{[1, 2, 3, 4].map((item) => <div key={item} style={{ height: 42, borderRadius: 8, background: '#f4f3f1' }}/>)}</div>; }
function RailCopy({ children }: { children: ReactNode }) { return <div style={{ color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{children}</div>; }
function DirectRow({ label, item, customer = false, absence }: { label: string; item?: UnifiedResult; customer?: boolean; absence: string }) { const value = item ? customer && item.sublabel?.includes('@') ? item.sublabel : item.id : absence; return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{label}</span>{item ? <Link href={item.href} style={{ color: '#64686d', textDecoration: 'none', font: "400 11px/1.5 'IBM Plex Mono',monospace" }}>{value}</Link> : <span style={{ color: '#64686d', font: "400 11px/1.5 'IBM Plex Mono',monospace" }}>{value}</span>}</div>; }
