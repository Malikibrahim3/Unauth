type SyncStatusScopesListProps = {
  scopes: string[];
  label: string;
};

export function SyncStatusScopesList({ scopes, label }: SyncStatusScopesListProps) {
  if (scopes.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--ua-text-secondary)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {scopes.map((scope) => (
          <span
            key={scope}
            className="rounded px-2 py-0.5 font-mono text-xs"
            style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' }}
          >
            {scope}
          </span>
        ))}
      </div>
    </div>
  );
}
