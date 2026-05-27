export default function CustomerProfileLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-md" style={{ background: 'var(--bg-subtle)' }} />
      <div className="rounded-xl p-5 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-subtle)' }} />
              <div className="h-5 w-14 rounded" style={{ background: 'var(--bg-subtle)' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 border h-48" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }} />
        ))}
      </div>
    </div>
  );
}
