import Link from 'next/link';
import { BookMarked } from 'lucide-react';

export default function SavedViewsPage() {
  return (
    <div className="p-8 space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <BookMarked className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          Saved Views
        </h1>
      </div>

      <div
        className="rounded-lg p-10 flex flex-col items-center gap-3 text-center"
        style={{ border: '1.5px dashed var(--border)' }}
      >
        <BookMarked className="h-8 w-8" style={{ color: 'var(--icon-muted)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          No saved views yet
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Save a filtered customer or transaction view and it will appear here.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/customers"
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Browse customers →
          </Link>
          <Link
            href="/watchlist"
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: 'var(--text-muted)' }}
          >
            View watchlist →
          </Link>
        </div>
      </div>
    </div>
  );
}
