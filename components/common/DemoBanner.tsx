'use client';

export default function DemoBanner() {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b px-4 py-1.5 text-[length:11.5px] leading-[1.45] sm:px-6"
      style={{
        background: '#edf6f8',
        borderColor: '#c4dfe5',
        color: '#247388',
      }}
    >
      <span>
        You&apos;re viewing demo data. Connect your store to see real data.
      </span>
    </div>
  );
}
