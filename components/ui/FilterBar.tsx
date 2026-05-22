'use client';

import { type ReactNode, useRef, type ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchConfig {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface FilterBarProps {
  search?: SearchConfig;
  rightActions?: ReactNode;
  activeFilterChips?: ReactNode;
  className?: string;
}

export function FilterBar({ search, rightActions, activeFilterChips, className }: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn('flex items-center gap-3', className)}
      style={{
        height: 44,
        paddingLeft: 14,
        paddingRight: 14,
        borderBottom: '1px solid var(--surface-border)',
        background: 'var(--surface-base)',
      }}
    >
      {/* Search input */}
      {search && (
        <div className="relative flex items-center" style={{ maxWidth: 280, width: '100%' }}>
          <Search
            className="absolute pointer-events-none"
            style={{ left: 10, width: 13, height: 13, color: 'var(--ink-tertiary)' }}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={search.value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search…'}
            style={{
              width: '100%',
              paddingLeft: 30,
              paddingRight: search.value ? 30 : 10,
              height: 28,
              borderRadius: 4,
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-input)',
              fontSize: 12,
              color: 'var(--ink-primary)',
              outline: 'none',
            }}
            className="placeholder:text-[var(--ink-tertiary)] focus:border-[var(--copper-bright)] transition-colors"
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.onChange('')}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: 8,
                color: 'var(--ink-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
              className="hover:text-[var(--ink-primary)] transition-colors"
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterChips && (
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {activeFilterChips}
        </div>
      )}

      {/* Right actions */}
      {rightActions && (
        <div className="ml-auto flex items-center gap-2">
          {rightActions}
        </div>
      )}
    </div>
  );
}
