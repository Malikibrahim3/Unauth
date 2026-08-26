'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { SearchResultIcon, searchTypeLabel } from '@/components/search/SearchResultIcon';
import { commandPaletteReducer, initialCommandPaletteState, type NavItem, type UnifiedResult } from './commandPaletteReducer';
import { fetchSearchResults } from './commandPaletteFetch';

type PaletteResult = {
  key: string;
  group: string;
  label: string;
  description: string;
  href: string;
  type?: UnifiedResult['type'];
  icon?: React.ReactNode;
};
const PALETTE_SEARCH_TYPES = ['customers', 'orders', 'cases', 'tickets'] as const;

export function commandResultGroup(type: UnifiedResult['type']): string {
  if (type === 'case') return 'Cases';
  if (type === 'customer') return 'Customers';
  if (type === 'ticket') return 'Support records';
  if (['order', 'shipment', 'refund', 'return', 'dispute'].includes(type)) return 'Commerce records';
  return 'Financial records';
}

export default function CommandPaletteSurface({
  navItems,
  onClose,
  inputRef,
  workspaceName,
}: {
  navItems: NavItem[];
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  workspaceName?: string | null;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(commandPaletteReducer, initialCommandPaletteState);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const trimmed = state.query.trim();
  const navigation = trimmed
    ? navItems.filter((item) => `${item.label} ${item.description} ${item.group ?? ''}`.toLowerCase().includes(trimmed.toLowerCase()))
    : navItems;
  const results = useMemo<PaletteResult[]>(() => {
    const workspaceResults = state.unifiedResults
      .map((item) => ({ key: `${item.type}-${item.id}`, group: commandResultGroup(item.type), label: item.label, description: item.sublabel ?? searchTypeLabel(item.type), href: item.href, type: item.type }))
      .slice(0, 10);
    const navigationResults = navigation
      .map((item) => ({ key: `nav-${item.href}`, group: item.group ?? 'Workspace', label: item.label, description: item.description, href: item.href, icon: item.icon }));
    return [...workspaceResults, ...navigationResults];
  }, [navigation, state.unifiedResults]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    generation.current += 1;
  }, []);

  useEffect(() => {
    if (state.activeIdx >= results.length && results.length > 0) {
      dispatch({ type: 'setActiveIdx', activeIdx: results.length - 1 });
    }
  }, [results.length, state.activeIdx]);

  const schedule = useCallback((query: string) => {
    if (timer.current) clearTimeout(timer.current);
    const token = ++generation.current;
    const value = query.trim();
    if (value.length < 2) { dispatch({ type: 'searchClear' }); return; }
    dispatch({ type: 'searchStart' });
    timer.current = setTimeout(() => void fetchSearchResults(value, {
      types: [...PALETTE_SEARCH_TYPES],
      limit: 6,
    }).then((data) => {
      if (generation.current !== token) return;
      const allRequestedFamiliesFailed = data.unifiedResults.length === 0
        && PALETTE_SEARCH_TYPES.every((family) => data.partialFailures.includes(family));
      dispatch(allRequestedFamiliesFailed
        ? { type: 'searchFailure', error: 'Workspace search is unavailable. Navigation still works.' }
        : { type: 'searchSuccess', ...data });
    }).catch(() => {
      if (generation.current === token) dispatch({ type: 'searchFailure', error: 'Workspace records are temporarily unavailable. Navigation still works.' });
    }), 240);
  }, []);

  function go(href: string) { onClose(); router.push(href); }
  function submit() { const item = results[state.activeIdx]; if (item) go(item.href); else if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`); }
  const groups = [...new Set(results.map((item) => item.group))];

  return <>
    <header className="ua-command-palette__scope">
      <span>Search this workspace</span>
      <strong>{workspaceName?.trim() || 'Current workspace'}</strong>
    </header>
    <div className="ua-command-palette__input">
      <Search size={17} aria-hidden="true" />
      <input ref={inputRef} value={state.query} placeholder="Search records or go to a page" role="combobox" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results[state.activeIdx] ? `command-result-${state.activeIdx}` : undefined} aria-autocomplete="list" aria-label="Search records or navigate" onChange={(event) => { dispatch({ type: 'setQuery', query: event.target.value }); schedule(event.target.value); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); dispatch({ type: 'setActiveIdx', activeIdx: Math.min(state.activeIdx + 1, Math.max(0, results.length - 1)) }); } else if (event.key === 'ArrowUp') { event.preventDefault(); dispatch({ type: 'setActiveIdx', activeIdx: Math.max(0, state.activeIdx - 1) }); } else if (event.key === 'Enter') { event.preventDefault(); submit(); } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }} />
      {state.searchingCustomers ? <span role="status">Searching…</span> : null}
    </div>
    <div className="ua-command-palette__results">
      {state.searchError ? <p role="alert">{state.searchError} Use the page destinations below or open full search.</p> : null}
      {state.partialFailures.length ? <p role="status">Some record groups could not be searched: {state.partialFailures.join(', ')}. Available results are shown.</p> : null}
      {state.restrictedTypes.length ? <p role="status">Your role excludes these record groups: {state.restrictedTypes.join(', ')}. Permitted results and navigation are shown.</p> : null}
      {trimmed.length === 1 ? <p>Type one more character to search workspace records.</p> : null}
      <div id="command-results" role="listbox" aria-label="Search results">
        {groups.map((group) => {
          const items = results.map((item, index) => ({ item, index })).filter(({ item }) => item.group === group);
          if (!items.length) return null;
          return <section className="ua-command-palette__group" key={group} role="group" aria-label={group}><h2 role="presentation">{group}</h2>{items.map(({ item, index }) => <button id={`command-result-${index}`} key={item.key} type="button" role="option" aria-selected={state.activeIdx === index} onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: index })} onClick={() => go(item.href)}><i>{item.type ? <SearchResultIcon type={item.type} /> : item.icon}</i><span><strong>{item.label}</strong><small>{item.description}</small></span><ArrowRight size={14} aria-hidden="true" /></button>)}</section>;
        })}
      </div>
      {!results.length && !state.searchingCustomers && !state.searchError ? (
        <div className="ua-command-palette__empty" role="status">
          <strong>{trimmed ? 'No matching records or destinations' : 'No destinations are available for this role'}</strong>
          <span>{trimmed ? 'Check the spelling, change the search, or continue in full search without losing this query.' : 'Your current permissions determine which workspace destinations appear.'}</span>
          {trimmed ? <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}>Open full search</button> : null}
        </div>
      ) : null}
    </div>
    <footer className="ua-command-palette__footer"><span>Arrow keys select</span><span>Enter opens</span><span>Esc closes</span><a href={trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search'}>Full search</a></footer>
  </>;
}
