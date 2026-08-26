'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { fetchSearchResults, SearchPermissionError } from '@/components/layout/commandPaletteFetch';
import type { UnifiedResult } from '@/components/layout/commandPaletteReducer';
import { searchTypeLabel } from './SearchResultIcon';
import { Button } from '@/components/ui';
import type { Permission } from '@/lib/permissions';
import { getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import { allowedSearchApiTypes, canSearchResultType } from '@/lib/search/access';
import styles from './WorkspaceSearchOperations.module.css';

type SearchType = 'all' | 'case' | 'customer' | 'order' | 'recovery';
type SearchSource = 'all' | 'shopify' | 'gorgias' | 'shipbob' | 'ups' | 'manual';

const TYPE_OPTIONS: Array<{ value: SearchType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'case', label: 'Cases' },
  { value: 'customer', label: 'Customers' },
  { value: 'order', label: 'Orders' },
  { value: 'recovery', label: 'Recoveries' },
];

const SOURCE_OPTIONS: Array<{ value: SearchSource; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'gorgias', label: 'Gorgias' },
  { value: 'shipbob', label: 'ShipBob' },
  { value: 'ups', label: 'UPS' },
  { value: 'manual', label: 'Manual' },
];

function isSearchType(value: string | undefined): value is SearchType {
  return value === 'all' || TYPE_OPTIONS.some((option) => option.value === value);
}

function isSearchSource(value: string | undefined): value is SearchSource {
  return SOURCE_OPTIONS.some((option) => option.value === value);
}

function searchHref(query: string, type: SearchType, source: SearchSource, cursor: string | null) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (type !== 'all') params.set('type', type);
  if (source !== 'all') params.set('source', source);
  if (cursor) params.set('cursor', cursor);
  return `/search${params.size ? `?${params.toString()}` : ''}`;
}

function moveSearchResultFocus(event: KeyboardEvent<HTMLAnchorElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const region = event.currentTarget.closest('#workspace-search-results');
  const results = region ? [...region.querySelectorAll<HTMLAnchorElement>('[data-search-result]')] : [];
  if (!results.length) return;
  const current = results.indexOf(event.currentTarget);
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? results.length - 1
      : event.key === 'ArrowDown'
        ? Math.min(results.length - 1, current + 1)
        : Math.max(0, current - 1);
  event.preventDefault();
  results[next]?.focus();
}

function resultTone(type: UnifiedResult['type']) {
  if (type === 'case') return 'case';
  if (type === 'customer') return 'customer';
  if (type === 'recovery') return 'recovery';
  return 'neutral';
}

export function WorkspaceSearch({
  initialQuery = '',
  initialType,
  initialSource,
  initialCursor = null,
  permissions = [],
}: {
  initialQuery?: string;
  initialType?: string;
  initialSource?: string;
  initialCursor?: string | null;
  permissions?: Permission[];
}) {
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const permittedDestinationCount = useMemo(() => getCommandPaletteNavItems(permissionSet).length, [permissionSet]);
  const allowedApiTypes = useMemo(() => allowedSearchApiTypes(permissionSet), [permissionSet]);
  const initialTypeValue = isSearchType(initialType) && (initialType === 'all' || canSearchResultType(initialType, permissionSet)) ? initialType : 'all';
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(initialTypeValue);
  const [source, setSource] = useState<SearchSource>(isSearchSource(initialSource) ? initialSource : 'all');
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([initialCursor]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  const [total, setTotal] = useState(0);
  const [restrictedTypes, setRestrictedTypes] = useState<string[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [status, setStatus] = useState<'initial' | 'minimum' | 'loading' | 'ready' | 'empty' | 'denied' | 'error'>(initialQuery.length >= 2 ? 'loading' : 'initial');
  const generation = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.history.replaceState(null, '', searchHref(query, type, source, cursor));
  }, [cursor, query, source, type]);

  useEffect(() => {
    const trimmed = query.trim();
    const token = ++generation.current;
    if (!trimmed) {
      setResults([]); setCounts({ all: 0 }); setTotal(0); setRestrictedTypes([]); setStatus('initial');
      return;
    }
    if (trimmed.length < 2) {
      setResults([]); setCounts({ all: 0 }); setTotal(0); setRestrictedTypes([]); setStatus('minimum');
      return;
    }
    if (!allowedApiTypes.length) {
      setResults([]); setCounts({ all: 0 }); setTotal(0); setRestrictedTypes([]); setStatus('denied');
      return;
    }
    setStatus('loading');
    const timer = window.setTimeout(() => {
      void fetchSearchResults(trimmed, {
        types: allowedApiTypes,
        limit: 20,
        type: type === 'all' ? undefined : type,
        source,
        cursor,
      }).then((response) => {
        if (token !== generation.current) return;
        setResults(response.unifiedResults);
        setCounts(response.counts);
        setTotal(response.total);
        setNextCursor(response.nextCursor);
        setRestrictedTypes(response.restrictedTypes);
        setStatus(response.unifiedResults.length ? 'ready' : 'empty');
      }).catch((reason: unknown) => {
        if (token !== generation.current) return;
        setResults([]); setCounts({ all: 0 }); setTotal(0); setNextCursor(null); setRestrictedTypes([]);
        setStatus(reason instanceof SearchPermissionError ? 'denied' : 'error');
      });
    }, 240);
    return () => window.clearTimeout(timer);
  }, [allowedApiTypes, cursor, query, retryToken, source, type]);

  const availableTypes = TYPE_OPTIONS.filter((option) => option.value === 'all' || canSearchResultType(option.value, permissionSet));
  const coverage = `Exact search across ${allowedApiTypes.length} permitted record groups`;

  function resetCursor() {
    setCursor(null);
    setCursorHistory([null]);
    setPageIndex(0);
    setNextCursor(null);
  }

  function updateQuery(value: string) {
    setQuery(value.slice(0, 120));
    resetCursor();
  }

  function updateType(value: SearchType) {
    setType(value);
    resetCursor();
  }

  function updateSource(value: SearchSource) {
    setSource(value);
    resetCursor();
  }

  function goNext() {
    if (!nextCursor) return;
    setCursorHistory((history) => [...history.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((value) => value + 1);
    setCursor(nextCursor);
  }

  function goPrevious() {
    if (pageIndex <= 0) return;
    const previous = cursorHistory[pageIndex - 1] ?? null;
    setPageIndex((value) => Math.max(0, value - 1));
    setCursor(previous);
  }

  return (
    <section className={styles.root} data-surface-id="search-route" data-operations-surface="search" data-search-status={status} data-permitted-destinations={permittedDestinationCount}>
      <div className={styles.scope}>
        <span className={styles.scopeDot} aria-hidden="true" />
        <span>Search covers the workspace record groups permitted for your role.</span>
        <span className={styles.scopeSeparator}>·</span>
        <span className={styles.scopeDetail}>Counts, source scope, and pagination are resolved by the server.</span>
      </div>

      <div className={styles.card}>
        <div className={styles.queryBar}>
          <div className={styles.query}>
            <Search size={14} aria-hidden="true" />
            <label htmlFor="workspace-search" className="sr-only">Search workspace records</label>
            <input
              ref={inputRef}
              id="workspace-search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown' || status !== 'ready') return;
                const first = document.querySelector<HTMLAnchorElement>('#workspace-search-results [data-search-result]');
                if (!first) return;
                event.preventDefault();
                first.focus();
              }}
              autoFocus
              autoComplete="off"
              placeholder="Search cases, customers, orders"
              aria-controls="workspace-search-results"
            />
            {query ? <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => { updateQuery(''); inputRef.current?.focus(); }}><X size={13} /></button> : null}
            <span className={styles.queryCount}>{status === 'loading' ? 'Searching…' : `${total} ${total === 1 ? 'result' : 'results'}`}</span>
          </div>
          <label className={styles.sourceFilter}>
            <span className="sr-only">Source</span>
            <select value={source} onChange={(event) => updateSource(event.target.value as SearchSource)}>
              {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.types} role="tablist" aria-label="Search result types">
          {availableTypes.map((option) => (
            <button key={option.value} type="button" role="tab" aria-selected={type === option.value} data-active={type === option.value} className={styles.type} onClick={() => updateType(option.value)}>
              {option.label} · {counts[option.value] ?? 0}
            </button>
          ))}
        </div>

        {restrictedTypes.length ? <p className={styles.notice} data-tone="info" role="status">Your role excludes: {restrictedTypes.join(', ')}. Permitted results are shown.</p> : null}

        <div id="workspace-search-results">
          {status === 'loading' ? <div className={styles.skeletons} aria-label="Searching workspace records" role="status">{[1, 2, 3, 4].map((item) => <div key={item} className={styles.skeleton} />)}</div> : null}
          {status === 'ready' ? <div className={styles.results}>{results.map((item) => (
            <Link key={`${item.type}-${item.id}`} href={item.href} data-search-result className={styles.row} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); inputRef.current?.focus(); } else moveSearchResultFocus(event); }}>
              <span className={styles.kind} data-tone={resultTone(item.type)}>{searchTypeLabel(item.type)}</span>
              <span className={styles.copy}><strong>{item.label}</strong><small>{item.sublabel ?? `${searchTypeLabel(item.type)} · ${item.source ?? 'workspace'} record`}</small></span>
              <span className={styles.open}>Open ↗</span>
            </Link>
          ))}</div> : null}
          {status === 'initial' ? <SearchState title="Search the operating record" body="Use a name, email, source reference, tracking number or record ID." /> : null}
          {status === 'minimum' ? <SearchState title="Keep typing" body="Enter at least two characters to search workspace records." /> : null}
          {status === 'empty' ? <SearchState title="No match in this search scope" body={`No permitted canonical record matched “${query.trim()}” for ${SOURCE_OPTIONS.find((option) => option.value === source)?.label.toLowerCase()}.`} /> : null}
          {status === 'denied' ? <SearchState title="Workspace records are restricted" body="Your current role does not include workspace entity search." /> : null}
          {status === 'error' ? <SearchState title="Workspace search is unavailable" body="The server could not return exact, merchant-scoped results. No partial count is shown." action={<Button variant="secondary" size="sm" onClick={() => setRetryToken((value) => value + 1)}>Try again</Button>} /> : null}
        </div>

        <footer className={styles.footer}>
          <span><kbd>↑↓</kbd> move</span>
          <span><kbd>↵</kbd> open</span>
          <span className={styles.footerMeta}>{coverage} · {results.length} shown of {total}</span>
          {pageIndex > 0 || nextCursor ? <span className={styles.pager}><button type="button" onClick={goPrevious} disabled={pageIndex <= 0} aria-label="Previous search page">←</button><button type="button" onClick={goNext} disabled={!nextCursor} aria-label="Next search page">→</button></span> : null}
        </footer>
      </div>
    </section>
  );
}

function SearchState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className={styles.state}><span className={styles.stateIcon}><Search size={18} aria-hidden="true" /></span><h2>{title}</h2><p>{body}</p>{action}</div>;
}
