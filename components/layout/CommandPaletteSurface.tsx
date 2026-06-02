'use client';

import { useCallback, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  commandPaletteReducer,
  initialCommandPaletteState,
  type CustomerResult,
  type NavItem,
} from '@/components/layout/commandPaletteReducer';
import { fetchSearchResults } from '@/components/layout/commandPaletteFetch';
import { CommandPaletteFooter, CommandPaletteInputBar } from '@/components/layout/CommandPaletteInputBar';
import { CommandPaletteResultsList } from '@/components/layout/CommandPaletteResultsList';

type CommandPaletteSurfaceProps = {
  navItems: NavItem[];
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
};

export default function CommandPaletteSurface({ navItems, onClose, inputRef }: CommandPaletteSurfaceProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(commandPaletteReducer, initialCommandPaletteState);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchGenerationRef = useRef(0);

  const filteredNav = state.query.trim()
    ? navItems.filter(
        (item) =>
          item.label.toLowerCase().includes(state.query.toLowerCase()) ||
          item.description.toLowerCase().includes(state.query.toLowerCase()),
      )
    : navItems;

  const totalItems = (state.query.trim() ? 1 : 0) + state.customerResults.length + filteredNav.length;

  const scheduleSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      dispatch({ type: 'searchClear' });
      return;
    }
    dispatch({ type: 'searchStart' });
    const generation = searchGenerationRef.current + 1;
    searchGenerationRef.current = generation;
    debounceRef.current = setTimeout(() => {
      fetchSearchResults(trimmed)
        .then((results) => {
          if (searchGenerationRef.current !== generation) return;
          dispatch({ type: 'searchSuccess', ...results });
        })
        .catch(() => {
          if (searchGenerationRef.current !== generation) return;
          dispatch({ type: 'searchClear' });
        });
    }, 250);
  }, []);

  const handleSelect = useCallback(
    (item: NavItem) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose],
  );

  const handleCustomerSelect = useCallback(
    (customer: CustomerResult) => {
      onClose();
      router.push(`/customers/${customer.id}`);
    },
    [router, onClose],
  );

  const handleSearchSubmit = useCallback(() => {
    if (state.query.trim()) {
      onClose();
      router.push(`/customers?q=${encodeURIComponent(state.query.trim())}`);
    } else if (filteredNav.length > 0) {
      handleSelect(filteredNav[state.activeIdx] ?? filteredNav[0]);
    }
  }, [state.query, filteredNav, state.activeIdx, onClose, router, handleSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatch({ type: 'setActiveIdx', activeIdx: Math.min(state.activeIdx + 1, totalItems - 1) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatch({ type: 'setActiveIdx', activeIdx: Math.max(state.activeIdx - 1, 0) });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.query.trim()) {
          if (state.activeIdx === 0) {
            handleSearchSubmit();
            return;
          }
          const customerOffset = 1;
          if (state.activeIdx < customerOffset + state.customerResults.length) {
            handleCustomerSelect(state.customerResults[state.activeIdx - customerOffset]);
            return;
          }
          const navOffset = customerOffset + state.customerResults.length;
          const navItem = filteredNav[state.activeIdx - navOffset];
          if (navItem) handleSelect(navItem);
        } else {
          const navItem = filteredNav[state.activeIdx];
          if (navItem) handleSelect(navItem);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [
      filteredNav,
      state.activeIdx,
      state.query,
      state.customerResults,
      handleSelect,
      handleCustomerSelect,
      handleSearchSubmit,
      onClose,
      totalItems,
    ],
  );

  let globalIdx = 0;
  const searchRowIdx = state.query.trim() ? globalIdx++ : -1;
  const customerStartIdx = globalIdx;
  globalIdx += state.customerResults.length;
  const navStartIdx = globalIdx;

  return (
    <>
      <CommandPaletteInputBar
        inputRef={inputRef}
        query={state.query}
        searchingCustomers={state.searchingCustomers}
        dispatch={dispatch}
        onScheduleSearch={scheduleSearch}
        onKeyDown={handleKeyDown}
      />

      <CommandPaletteResultsList
        state={state}
        filteredNav={filteredNav}
        searchRowIdx={searchRowIdx}
        customerStartIdx={customerStartIdx}
        navStartIdx={navStartIdx}
        dispatch={dispatch}
        onClose={onClose}
        onSearchSubmit={handleSearchSubmit}
        onCustomerSelect={handleCustomerSelect}
        onNavSelect={handleSelect}
      />

      <CommandPaletteFooter />
    </>
  );
}
