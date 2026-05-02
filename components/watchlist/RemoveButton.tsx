'use client';

interface RemoveButtonProps {
  id: string;
}

export default function RemoveButton({ id }: RemoveButtonProps) {
  async function handleRemove() {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    window.location.reload();
  }
  return (
    <button onClick={handleRemove} className="text-xs transition-colors" style={{ color: 'var(--text-subtle)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--risk-critical)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}>
      Remove
    </button>
  );
}
