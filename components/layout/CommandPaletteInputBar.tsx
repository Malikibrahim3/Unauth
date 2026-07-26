'use client';

import type { Dispatch } from 'react';
import { Search } from 'lucide-react';
import type { CommandPaletteAction } from '@/components/layout/commandPaletteReducer';

type CommandPaletteInputBarProps = {
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  searchingCustomers: boolean;
  dispatch: Dispatch<CommandPaletteAction>;
  onScheduleSearch: (query: string) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

export function CommandPaletteInputBar({
  inputRef,
  query,
  searchingCustomers,
  dispatch,
  onScheduleSearch,
  onKeyDown,
}: CommandPaletteInputBarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--ua-border-subtle)' }}
    >
      <Search
        size={16}
        aria-hidden="true"
        style={{ color: 'var(--ua-icon-secondary)', flexShrink: 0 }}
      />
      <input
        ref={inputRef}
        type="text"
        aria-label="Search customers, cases, and evidence"
        placeholder="Search customers, cases, evidence…"
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value;
          dispatch({ type: 'setQuery', query: nextQuery });
          onScheduleSearch(nextQuery);
        }}
        onKeyDown={onKeyDown}
        className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--ua-action-primary)]"
        style={{ color: 'var(--ua-text-primary)' }}
        autoComplete="off"
        spellCheck={false}
      />
      {searchingCustomers ? (
        <div
          className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
          style={{ borderColor: 'var(--ua-border-default)', borderTopColor: 'var(--ua-action-primary)' }}
        />
      ) : null}
      {query ? (
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'setQuery', query: '' });
            dispatch({ type: 'searchClear' });
          }}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: 'var(--ua-text-tertiary)', background: 'var(--ua-surface-secondary)' }}
        >
          Clear
        </button>
      ) : null}
      <kbd
        className="hidden sm:inline font-mono text-xs px-1.5 py-0.5 rounded"
        style={{ color: 'var(--ua-text-tertiary)', background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-default)' }}
      >
        esc
      </kbd>
    </div>
  );
}

export function CommandPaletteFooter() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2"
      style={{ borderTop: '1px solid var(--ua-border-subtle)', background: 'var(--ua-surface-secondary)' }}
    >
      <span className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
        <kbd className="font-mono mr-1">↑↓</kbd>navigate
      </span>
      <span className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
        <kbd className="font-mono mr-1">↵</kbd>open
      </span>
      <span className="text-xs" style={{ color: 'var(--ua-text-tertiary)' }}>
        <kbd className="font-mono mr-1">esc</kbd>close
      </span>
    </div>
  );
}
