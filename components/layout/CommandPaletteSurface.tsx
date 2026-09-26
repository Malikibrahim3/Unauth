'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

function SearchGlyph() {
  return <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="6.1" cy="6.1" r="3.8"/><path d="m9 9 2.8 2.8"/></svg>;
}

function ResultGlyph({ item }: { item: PaletteResult }) {
  if (item.type) return <SearchResultIcon type={item.type} size={13}/>;
  return <>{item.icon}</>;
}

export function commandResultGroup(type: UnifiedResult['type']): string {
  if (type === 'case') return 'Cases';
  if (type === 'customer') return 'Customers';
  if (type === 'ticket') return 'Support records';
  if (['order', 'shipment', 'refund', 'return', 'dispute'].includes(type)) return 'Orders';
  return 'Claims and settlements';
}

export default function CommandPaletteSurface({
  navItems,
  onClose,
  inputRef,
  workspaceName: _workspaceName,
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
    const navigationResults = navigation.map((item) => ({ key: `nav-${item.href}`, group: item.group ?? 'Do something', label: item.label, description: item.description, href: item.href, icon: item.icon }));
    return [...workspaceResults, ...navigationResults];
  }, [navigation, state.unifiedResults]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    generation.current += 1;
  }, []);

  useEffect(() => {
    if (state.activeIdx >= results.length && results.length > 0) dispatch({ type: 'setActiveIdx', activeIdx: results.length - 1 });
  }, [results.length, state.activeIdx]);

  const schedule = useCallback((query: string) => {
    if (timer.current) clearTimeout(timer.current);
    const token = ++generation.current;
    const value = query.trim();
    if (value.length < 2) {
      dispatch({ type: 'searchClear' });
      return;
    }
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

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function submit() {
    const item = results[state.activeIdx];
    if (item) go(item.href);
    else if (trimmed) go(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const groups = [...new Set(results.map((item) => item.group))];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 17px', borderBottom: '1px solid #eae8e5' }}>
        <SearchGlyph />
        <input
          ref={inputRef}
          autoFocus
          value={state.query}
          placeholder="Search cases, orders, customers and references"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results[state.activeIdx] ? `command-result-${state.activeIdx}` : undefined}
          aria-autocomplete="list"
          aria-label="Search records or navigate"
          onChange={(event) => {
            dispatch({ type: 'setQuery', query: event.target.value });
            schedule(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              dispatch({ type: 'setActiveIdx', activeIdx: Math.min(state.activeIdx + 1, Math.max(0, results.length - 1)) });
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              dispatch({ type: 'setActiveIdx', activeIdx: Math.max(0, state.activeIdx - 1) });
            } else if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 0, padding: 0, background: 'transparent', color: '#1c1f23', font: "400 15px/1.2 'Inter',sans-serif" }}
        />
        {state.searchingCustomers ? <span role="status" style={{ font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>searching</span> : null}
        <span style={{ padding: '3px 7px', borderRadius: 6, background: '#f4f2ef', font: "400 10px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>ESC</span>
      </div>
      <div id="command-results" role="listbox" aria-label="Search results" style={{ minHeight: 0, overflowY: 'auto', padding: '4px 8px 8px', display: 'flex', flexDirection: 'column' }}>
        {state.searchError ? <div role="alert" style={{ margin: '6px 8px 2px', padding: '9px 11px', borderRadius: 9, background: '#fdf0e6', font: "400 11px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{state.searchError} Use the page destinations below or open full search.</div> : null}
        {state.partialFailures.length ? <div role="status" style={{ margin: '6px 8px 2px', font: "400 10.5px/1.5 'Inter',sans-serif", color: '#7a5310' }}>Some record groups did not answer: {state.partialFailures.join(', ')}. Available results are shown.</div> : null}
        {state.restrictedTypes.length ? <div role="status" style={{ margin: '6px 8px 2px', font: "400 10.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Your role excludes {state.restrictedTypes.join(', ')}. Permitted results and navigation are shown.</div> : null}
        {trimmed.length === 1 ? <div style={{ margin: '6px 8px 2px', font: "400 10.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Type one more character to search workspace records.</div> : null}
        {groups.map((group) => {
          const groupItems = results.map((item, index) => ({ item, index })).filter(({ item }) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <section key={group} role="group" aria-label={group}>
              <div role="presentation" style={{ padding: '8px 8px 2px', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.07em', color: '#64686d', textTransform: 'uppercase' }}>{group} · {groupItems.length}</div>
              {groupItems.map(({ item, index }) => {
                const active = state.activeIdx === index;
                return (
                  <button
                    id={`command-result-${index}`}
                    key={item.key}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => dispatch({ type: 'setActiveIdx', activeIdx: index })}
                    onFocus={() => dispatch({ type: 'setActiveIdx', activeIdx: index })}
                    onClick={() => go(item.href)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', border: 0, borderRadius: 9, background: active ? '#f4f3f1' : '#ffffff', boxShadow: active ? 'inset 0 0 0 1px rgba(28,27,25,.07)' : 'none', color: '#1c1f23', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', borderRadius: 7, background: active ? '#1c1f23' : '#f2f0ed', color: active ? '#ffffff' : '#64686d', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "500 9px/1 'IBM Plex Mono',monospace" }}><ResultGlyph item={item}/></span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "500 12.5px/1.4 'Inter',sans-serif" }}>{item.label}</span>
                    <span style={{ flex: 'none', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{item.description}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
        {!results.length && !state.searchingCustomers && !state.searchError ? <div role="status" style={{ padding: '30px 18px', textAlign: 'center' }}><div style={{ font: "500 12.5px/1.4 'Inter',sans-serif" }}>{trimmed ? 'No matching records or destinations' : 'No destinations are available for this role'}</div><div style={{ marginTop: 5, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{trimmed ? 'Check the spelling, change the search, or continue in full search without losing this query.' : 'Your current permissions determine which workspace destinations appear.'}</div>{trimmed ? <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)} style={{ marginTop: 10, border: 0, background: 'transparent', color: '#9b470d', font: "500 11.5px/1.5 'Inter',sans-serif" }}>Open full search</button> : null}</div> : null}
      </div>
      <div style={{ padding: '10px 15px', background: '#ffffff', borderTop: '1px solid #eae8e5', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ padding: '2px 5px', borderRadius: 5, background: '#f2f0ed', font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>↑↓</span><span style={{ font: "400 10.5px/1 'Inter',sans-serif", color: '#64686d' }}>move</span></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ padding: '2px 5px', borderRadius: 5, background: '#f2f0ed', font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>↵</span><span style={{ font: "400 10.5px/1 'Inter',sans-serif", color: '#64686d' }}>open</span></span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ padding: '2px 5px', borderRadius: 5, background: '#f2f0ed', font: "400 9.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>⌘↵</span><span style={{ font: "400 10.5px/1 'Inter',sans-serif", color: '#64686d' }}>open beside</span></span>
        <span style={{ flex: 1 }} />
        <span style={{ font: "400 10.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>searches ids, names and references — not case notes</span>
      </div>
    </>
  );
}
