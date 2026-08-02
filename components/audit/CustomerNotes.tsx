'use client';

import { useReducer } from 'react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  customerNotesReducer,
  initialCustomerNotesState,
} from '@/components/audit/customerNotesReducer';
import { formatDateAbsolute } from '@/lib/utils/format';

interface Note {
  id: string;
  body: string;
  created_at: string;
}

interface CustomerNotesProps {
  customerProfileId: string;
}

function formatNoteDate(d: string) {
  return formatDateAbsolute(d);
}

export default function CustomerNotes({ customerProfileId }: CustomerNotesProps) {
  const [state, dispatch] = useReducer(customerNotesReducer, initialCustomerNotesState);
  const { data, loading, reload } = useFetchJson<{ notes?: Note[] }>(
    `/api/customers/${customerProfileId}/notes`,
  );
  const notes = data?.notes ?? [];

  async function saveNote() {
    if (!state.draft.trim()) return;
    dispatch({ type: 'patch', patch: { saving: true } });
    const res = await fetch(`/api/customers/${customerProfileId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: state.draft.trim() }),
    });
    if (res.ok) {
      dispatch({
        type: 'patch',
        patch: {
          draft: '',
          savedMsg: 'Saved just now \u2713',
          saving: false,
        },
      });
      reload();
      setTimeout(() => dispatch({ type: 'patch', patch: { savedMsg: '' } }), 3000);
    } else {
      dispatch({ type: 'patch', patch: { saving: false } });
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Delete this note?')) return;
    dispatch({ type: 'patch', patch: { deletingId: id } });
    await fetch(`/api/customers/notes/${id}`, { method: 'DELETE' });
    dispatch({ type: 'patch', patch: { deletingId: null } });
    dispatch({ type: 'toggleSelected', id, checked: false });
    reload();
  }

  async function bulkDeleteSelected() {
    if (state.selectedIds.size === 0) return;
    if (!confirm(`Delete ${state.selectedIds.size} note(s)?`)) return;
    dispatch({ type: 'patch', patch: { bulkDeleting: true } });
    try {
      const ids = Array.from(state.selectedIds);
      const res = await fetch('/api/settings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'customer_notes', ids, confirm: true }),
      });
      if (res.ok) {
        dispatch({ type: 'clearSelected' });
        reload();
      }
    } finally {
      dispatch({ type: 'patch', patch: { bulkDeleting: false } });
    }
  }

  const { draft, saving, savedMsg, deletingId, selectedIds, bulkDeleting } = state;

  return (
    <div className="rounded-md p-4 space-y-3 border" style={{ borderColor: 'var(--ua-border-subtle)' }}>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="ua-text-metadata" style={{ color: 'var(--ua-text-secondary)' }}>
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={bulkDeleteSelected}
              disabled={bulkDeleting}
              className="ua-text-label rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--ua-risk-critical-bg)', color: 'var(--ua-risk-critical)', border: '1px solid var(--ua-risk-critical-border)' }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearSelected' })}
              disabled={bulkDeleting}
              className="ua-text-label"
              style={{ color: 'var(--ua-text-secondary)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>Loading…</p>}

      {!loading && notes.length === 0 && (
        <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>
          No notes yet. Add a quick note to remind yourself &mdash; these stay private to your store.
        </p>
      )}

      {notes.map((note) => {
        const checked = selectedIds.has(note.id);
        return (
          <div key={note.id} className="ua-text-dense flex items-start justify-between gap-2 pb-2" style={{ borderBottom: '1px solid var(--ua-border-subtle)' }}>
            <label className="flex items-start gap-2 min-w-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  dispatch({ type: 'toggleSelected', id: note.id, checked: e.target.checked });
                }}
              />
              <div className="min-w-0">
                <span className="ua-text-metadata mr-2" style={{ color: 'var(--ua-text-tertiary)' }}>{formatNoteDate(note.created_at)}</span>
                <span style={{ color: 'var(--ua-text-primary)' }}>{note.body}</span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => deleteNote(note.id)}
              disabled={deletingId === note.id || bulkDeleting}
              className="ua-text-label flex-shrink-0"
              style={{ color: 'var(--ua-text-tertiary)' }}
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
          onChange={(e) => dispatch({ type: 'patch', patch: { draft: e.target.value } })}
          aria-label="Add a note"
          placeholder="Add a note…"
          rows={2}
          className="ua-text-body w-full rounded px-3 py-2 focus:outline-none resize-none"
          style={{ border: '1px solid var(--ua-border-default)', background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-primary)' }}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveNote}
            disabled={saving || !draft.trim()}
            className="ua-text-working-title px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
          {savedMsg && <span className="ua-text-caption-role" style={{ color: 'var(--ua-success)' }}>{savedMsg}</span>}
        </div>
      </div>
    </div>
  );
}
