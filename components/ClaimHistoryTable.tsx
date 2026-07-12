import { StatusBadge as SharedStatusBadge } from '@/components/ui';

type Status = 'BLOCKED' | 'FLAGGED' | 'CLEARED';

interface ClaimRow {
  id: string;
  claims: number;
  absorbed: string;
  lastType: string;
  status: Status;
}

const rows: ClaimRow[] = [
  { id: 'C-4821', claims: 4, absorbed: '£341', lastType: 'Item not received',  status: 'BLOCKED'  },
  { id: 'C-9103', claims: 3, absorbed: '£218', lastType: 'Wrong item',         status: 'FLAGGED'  },
  { id: 'C-2277', claims: 1, absorbed: '£47',  lastType: 'Damaged',            status: 'CLEARED'  },
  { id: 'C-6614', claims: 5, absorbed: '£490', lastType: 'Item not received',  status: 'BLOCKED'  },
  { id: 'C-3890', claims: 2, absorbed: '£134', lastType: 'Late delivery',      status: 'FLAGGED'  },
];

const rowTint: Record<Status, string> = {
  BLOCKED: 'bg-red-500/[0.05]',
  FLAGGED: 'bg-amber-500/[0.04]',
  CLEARED: '',
};

const statusVariant: Record<Status, 'blocked' | 'flagged' | 'cleared'> = {
  BLOCKED: 'blocked',
  FLAGGED: 'flagged',
  CLEARED: 'cleared',
};

export default function ClaimHistoryTable() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/[0.07] bg-[#0f0f0e] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.56),0_0_0_1px_rgba(255,255,255,0.04)]">

      {/* Panel chrome */}
      <div className="flex h-10 items-center gap-3 border-b border-white/[0.07] px-5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.11]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.11]" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-white/[0.11]" aria-hidden />
        </div>
        <span className="ml-1 font-mono text-[10.5px] tracking-[0.10em] text-white/25 uppercase select-none">
          Claim history · {rows.length} customers
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {(['CUSTOMER', 'CLAIMS', 'ABSORBED', 'LAST TYPE', 'STATUS'] as const).map((col) => (
                <th
                  key={col}
                  className="px-5 py-3 text-left font-mono text-[10px] font-semibold tracking-[0.14em] text-white/30 uppercase first:pl-6 last:pr-6"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-white/[0.06] last:border-b-0 transition-colors ${rowTint[row.status]}`}
              >
                {/* CUSTOMER */}
                <td className="px-5 py-[14px] pl-6 font-mono text-[13px] font-semibold tracking-[0.03em] text-white/80">
                  {row.id}
                </td>

                {/* CLAIMS */}
                <td className="px-5 py-[14px] text-[13px]">
                  <span
                    className={
                      row.claims >= 3
                        ? 'font-semibold text-white'
                        : 'font-normal text-white/38'
                    }
                  >
                    {row.claims} {row.claims === 1 ? 'claim' : 'claims'}
                  </span>
                </td>

                {/* ABSORBED */}
                <td className="px-5 py-[14px] font-mono text-[13px] text-white/70 tabular-nums">
                  {row.absorbed}
                </td>

                {/* LAST TYPE */}
                <td className="px-5 py-[14px] text-[13px] text-white/55">
                  {row.lastType}
                </td>

                {/* STATUS */}
                <td className="px-5 py-[14px] pr-6">
                  <SharedStatusBadge variant={statusVariant[row.status]}>{row.status}</SharedStatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel footer */}
      <div className="flex items-center gap-6 border-t border-white/[0.06] px-6 py-3">
        <span className="font-mono text-[10.5px] tracking-[0.08em] text-white/20 uppercase">
          {rows.filter(r => r.status === 'BLOCKED').length} blocked
        </span>
        <span className="font-mono text-[10.5px] tracking-[0.08em] text-white/20 uppercase">
          {rows.filter(r => r.status === 'FLAGGED').length} flagged
        </span>
        <span className="ml-auto font-mono text-[10.5px] tracking-[0.08em] text-white/20 uppercase">
          Claim intelligence · live
        </span>
      </div>

    </div>
  );
}
