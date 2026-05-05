'use client';

import { useState, useEffect } from 'react';

interface Note {
  id: string;
  body: string;
  created_at: string;
}

interface CustomerNotesProps {
  customerProfileId: string;
}

function formatNoteDate(d: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
}

export default function CustomerNotes({ customerProfileId }: CustomerNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${customerProfileId}/notes`)
      .then((r) => r.json())
      .then((d) => { setNotes(d.notes ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [customerProfileId]);

  async function saveNote() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/customers/${customerProfileId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setDraft('');
      setSavedMsg('Saved just now \u2713');
      setTimeout(() => setSavedMsg(''), 3000);
    }
    setSaving(false);
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    setDeletingId(id);
    await fetch(`/api/customers/notes/${id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} note(s)?`)) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/settings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'customer_notes', ids, confirm: true }),
      });
      if (res.ok) {
        const idSet = new Set(ids);
        setNotes((prev) => prev.filter((n) => !idSet.has(n.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="rounded-lg p-4 space-y-3 border" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-overline">Notes</h4>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} selected
            </span>
            <button
              onClick={bulkDeleteSelected}
              disabled={bulkDeleting}
              className="text-xs font-semibold rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', border: '1px solid var(--risk-critical-bd)' }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkDeleting}
              className="text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>Loading…</p>}

      {!loading && notes.length === 0 && (
        <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
          No notes yet. Add a quick note to remind yourself &mdash; these stay private to your store.
        </p>
      )}

      {notes.map((note) => {
        const checked = selectedIds.has(note.id);
        return (
          <div key={note.id} className="flex items-start justify-between gap-2 text-sm pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <label className="flex items-start gap-2 min-w-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (isChecked) next.add(note.id);
                    else next.delete(note.id);
                    return next;
                  });
                }}
              />
              <div className="min-w-0">
                <span className="text-xs mr-2" style={{ color: 'var(--text-subtle)' }}>{formatNoteDate(note.created_at)}</span>
                <span style={{ color: 'var(--text)' }}>{note.body}</span>
              </div>
            </label>
            <button
              onClick={() => deleteNote(note.id)}
              disabled={deletingId === note.id || bulkDeleting}
              className="text-xs flex-shrink-0"
              style={{ color: 'var(--text-subtle)' }}
              title="Delete note"
            >
              &times;
            </button>
          </div>
        );
      })}

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="w-full text-sm rounded px-3 py-2 focus:outline-none resize-none"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={saveNote}
            disabled={saving || !draft.trim()}
            className="px-3 py-1.5 text-xs font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
          {savedMsg && <span className="text-xs" style={{ color: 'var(--success)' }}>{savedMsg}</span>}
        </div>
      </div>
    </div>
  );
}
