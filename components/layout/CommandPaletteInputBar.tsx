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
      style={{ borderBottom: '1px solid var(--border-muted)' }}
    >
      <Search
        size={16}
        aria-hidden="true"
        style={{ color: 'var(--icon-muted)', flexShrink: 0 }}
      />
      <input
        ref={inputRef}
        type="text"
        aria-label="Search customers, audits, evidence packages"
        placeholder="Search customers, audits, evidence packages…"
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value;
          dispatch({ type: 'setQuery', query: nextQuery });
          onScheduleSearch(nextQuery);
        }}
        onKeyDown={onKeyDown}
        className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{ color: 'var(--text)' }}
        autoComplete="off"
        spellCheck={false}
      />
      {searchingCustomers ? (
        <div
          className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
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
          style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)' }}
        >
          Clear
        </button>
      ) : null}
      <kbd
        className="hidden sm:inline font-mono text-xs px-1.5 py-0.5 rounded"
        style={{ color: 'var(--text-tertiary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
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
      style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-subtle)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <kbd className="font-mono mr-1">↑↓</kbd>navigate
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <kbd className="font-mono mr-1">↵</kbd>open
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <kbd className="font-mono mr-1">esc</kbd>close
      </span>
    </div>
  );
}
