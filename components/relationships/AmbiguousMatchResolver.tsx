'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export type ResolverCandidate = {
  id: string;
  candidateEntityType: string;
  candidateEntityId: string;
  matchMethod: string;
  displayRef?: string | null;
};

/**
 * Lets a merchant resolve an ambiguous match by choosing one candidate (or
 * rejecting all). Resolution posts to /api/matches/[id]/resolve — the server is
 * the sole writer of the confirmed relationship. Unauth recommends; the merchant
 * decides.
 */
export function AmbiguousMatchResolver({
  candidates,
  onResolve,
  busy = false,
}: {
  candidates: ResolverCandidate[];
  onResolve: (selectedCandidateId: string | null) => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#E4E4E3] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#111]">Resolve which record this links to</p>
      <p className="mt-1 text-[12px] text-[#6B7280]">
        Multiple records match. Choose the correct one to confirm the link.
      </p>
      <ul className="mt-3 space-y-2">
        {candidates.map((c) => (
          <li key={c.id}>
            <label
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-[13px]',
                selected === c.id ? 'border-[#111] bg-[#FAFAF9]' : 'border-[#E4E4E3]',
              )}
            >
              <input
                type="radio"
                name="match-candidate"
                checked={selected === c.id}
                onChange={() => setSelected(c.id)}
              />
              <span className="font-medium text-[#111]">
                {c.displayRef ?? `${c.candidateEntityType} ${c.candidateEntityId.slice(0, 8)}`}
              </span>
              <span className="ml-auto font-mono text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                {c.matchMethod}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => onResolve(selected)}
          className="rounded-md bg-[#111] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          Confirm link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onResolve(null)}
          className="rounded-md border border-[#E4E4E3] px-3 py-1.5 text-[13px] font-semibold text-[#6B7280] disabled:opacity-40"
        >
          None of these
        </button>
      </div>
    </div>
  );
}
