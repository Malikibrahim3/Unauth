import Link from 'next/link';
import { Search, ArrowUpRight } from 'lucide-react';
import { getCommandPaletteNavItems } from '@/lib/navigation/appRoutes';
import { PageFrame, Surface } from '@/components/ui';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string };

function normalizeQuery(value: string | undefined): string {
  return (value ?? '').trim().slice(0, 120);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const query = normalizeQuery((await searchParams)?.q);
  const items = getCommandPaletteNavItems();
  const matches = query
    ? items.filter((item) => `${item.label} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 6);

  return (
    <PageFrame
      title="Search"
      subtitle="Find an operating surface, source, case, or setting without losing your place."
    >
      <Surface structure="working" className="overflow-hidden">
        <form action="/search" method="get" className="flex min-h-14 items-center gap-3 border-b border-[var(--ua-border-subtle)] px-4">
          <Search size={17} className="shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
          <label htmlFor="global-search" className="sr-only">Search the workspace</label>
          <input
            id="global-search"
            name="q"
            defaultValue={query}
            autoComplete="off"
            placeholder="Search workspace"
            className="h-10 min-w-0 flex-1 bg-transparent text-body text-[var(--ua-text-primary)] outline-none placeholder:text-[var(--ua-text-tertiary)]"
          />
          <kbd className="hidden rounded border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-2 py-1 text-metadata text-[var(--ua-text-tertiary)] sm:inline">⌘K</kbd>
        </form>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-label text-[var(--ua-text-tertiary)]">{query ? 'Matching surfaces' : 'Quick access'}</p>
              <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">
                {query ? `${matches.length} result${matches.length === 1 ? '' : 's'}` : 'Start with a core operating surface.'}
              </p>
            </div>
          </div>

          {matches.length ? (
            <div className="divide-y divide-[var(--ua-border-hairline)]">
              {matches.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)] focus-visible:outline-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-[var(--ua-text-primary)]">{item.label}</span>
                    {item.description ? <span className="mt-0.5 block text-caption text-[var(--ua-text-secondary)]">{item.description}</span> : null}
                  </span>
                  <ArrowUpRight size={15} className="shrink-0 text-[var(--ua-text-tertiary)] transition-colors group-hover:text-[var(--ua-action-700)]" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-[var(--ua-border-hairline)] pt-5 text-body text-[var(--ua-text-secondary)]">
              No surfaces match <span className="font-medium text-[var(--ua-text-primary)]">{query}</span>. Try a broader term or open Help for guidance.
            </div>
          )}
        </div>
      </Surface>
    </PageFrame>
  );
}
