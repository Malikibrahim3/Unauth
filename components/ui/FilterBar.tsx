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
      className={cn(
        'flex items-center gap-[var(--space-3)] h-12 px-[var(--space-5)] border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]',
        className,
      )}
    >
      {/* Search input */}
      {search && (
        <div className="relative flex items-center" style={{ maxWidth: 320, width: '100%' }}>
          <Search
            className="absolute left-[var(--space-3)] w-4 h-4 text-[var(--text-tertiary)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={search.value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Search…'}
            className={cn(
              'w-full pl-9 pr-9 h-8 rounded-[var(--radius-2)] border border-[var(--border-default)]',
              'bg-[var(--bg-surface)] text-body text-[var(--text-primary)]',
              'placeholder:text-[var(--text-tertiary)]',
              'focus:outline-none focus:ring-0',
              'focus-visible:border-[var(--accent-500)]',
              'transition-colors',
            )}
          />
          {search.value && (
            <button
              type="button"
              onClick={() => search.onChange('')}
              className="absolute right-[var(--space-3)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterChips && (
        <div className="flex items-center gap-[var(--space-2)] flex-1 flex-wrap">
          {activeFilterChips}
        </div>
      )}

      {/* Right actions */}
      {rightActions && (
        <div className="ml-auto flex items-center gap-[var(--space-2)]">
          {rightActions}
        </div>
      )}
    </div>
  );
}
