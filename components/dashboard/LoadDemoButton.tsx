'use client';

import Link from 'next/link';
import { FlaskConical } from 'lucide-react';

export function LoadDemoButton() {
  return (
    <Link
      href="/claims"
      className="mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors"
      style={{ background: 'var(--accent)', color: 'white' }}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      See sample context
    </Link>
  );
}
