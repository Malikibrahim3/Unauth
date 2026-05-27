export default function HistoryLoading() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded-md" style={{ background: 'var(--bg-subtle)' }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl h-16 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }} />
      ))}
    </div>
  );
}
