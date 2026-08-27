'use client';

import { useReducer, useState } from 'react';
import { Button, Checkbox, Modal, Textarea } from '@/components/ui';
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
  const [editorOpen, setEditorOpen] = useState(false);
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
      setEditorOpen(false);
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
    <div className="rounded-md p-4 space-y-3 border" style={{ borderColor: 'var(--uo-route-border-subtle)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="ua-text-caption-role">{loading ? 'Loading notes…' : `${notes.length} private note${notes.length === 1 ? '' : 's'}`}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditorOpen(true)}>
          Add note
        </Button>
      </div>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="ua-text-metadata" style={{ color: 'var(--uo-route-text-secondary)' }}>
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={bulkDeleteSelected}
              disabled={bulkDeleting}
              className="ua-text-label rounded px-2 py-1 disabled:opacity-50"
              style={{ background: 'var(--uo-route-risk-critical-bg)', color: 'var(--uo-route-risk-critical)', border: '1px solid var(--uo-route-risk-critical-border)' }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearSelected' })}
              disabled={bulkDeleting}
              className="ua-text-label"
              style={{ color: 'var(--uo-route-text-secondary)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>Loading…</p>}

      {!loading && notes.length === 0 && (
        <p className="text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>
          No notes yet. Add a quick note to remind yourself &mdash; these stay private to your store.
        </p>
      )}

      {notes.map((note) => {
        const checked = selectedIds.has(note.id);
        return (
          <div key={note.id} className="ua-text-dense flex items-start justify-between gap-2 pb-2" style={{ borderBottom: '1px solid var(--uo-route-border-subtle)' }}>
            <label className="flex items-start gap-2 min-w-0">
              <Checkbox
                checked={checked}
                onChange={(e) => {
                  dispatch({ type: 'toggleSelected', id: note.id, checked: e.target.checked });
                }}
              />
              <div className="min-w-0">
                <span className="ua-text-metadata mr-2" style={{ color: 'var(--uo-route-text-tertiary)' }}>{formatNoteDate(note.created_at)}</span>
                <span style={{ color: 'var(--uo-route-text-primary)' }}>{note.body}</span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => deleteNote(note.id)}
              disabled={deletingId === note.id || bulkDeleting}
              className="ua-text-label flex-shrink-0"
              style={{ color: 'var(--uo-route-text-tertiary)' }}
              title="Delete note"
            >
              &times;
            </button>
          </div>
        );
      })}

      {savedMsg && <span className="ua-text-caption-role" style={{ color: 'var(--uo-route-success)' }}>{savedMsg}</span>}
      <Modal
        open={editorOpen}
        onClose={() => {
          if (!saving) setEditorOpen(false);
        }}
        title="Add customer note"
        description="Private merchant context. Saving appends a new note; it does not alter source records."
        overlayId="customer-note-editor"
        size="sm"
        closeOnBackdrop={!saving}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveNote()} loading={saving} disabled={!draft.trim()}>Save note</Button>
          </>
        )}
      >
        <label className="ua-text-body block font-medium text-[var(--uo-route-text-primary)]">
          Note
          <Textarea
            value={draft}
            onChange={(e) => dispatch({ type: 'patch', patch: { draft: e.target.value } })}
            className="mt-1 resize-none"
            placeholder="Add private context for your team…"
            rows={5}
            maxLength={4000}
            autoFocus
          />
        </label>
      </Modal>
    </div>
  );
}
