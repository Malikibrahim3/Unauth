type SyncStatusScopesListProps = {
  scopes: string[];
  label: string;
};

export function SyncStatusScopesList({ scopes, label }: SyncStatusScopesListProps) {
  if (scopes.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-2" style={{ color: '#64686d' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {scopes.map((scope) => (
          <span
            key={scope}
            className="rounded px-2 py-0.5 font-mono text-xs"
            style={{ background: '#f4f3f1', color: '#64686d' }}
          >
            {scope}
          </span>
        ))}
      </div>
    </div>
  );
}
