'use client';

import { useReducer, useRef, useState } from 'react';
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
  canAdd?: boolean;
  canDelete?: boolean;
}

function formatNoteDate(d: string) {
  return formatDateAbsolute(d);
}

export default function CustomerNotes({ customerProfileId, canAdd = false, canDelete = false }: CustomerNotesProps) {
  const [state, dispatch] = useReducer(customerNotesReducer, initialCustomerNotesState);
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const { data, loading, error: loadError, reload } = useFetchJson<{ notes?: Note[] }>(
    `/api/customers/${customerProfileId}/notes`,
  );
  const notes = data?.notes ?? [];

  async function saveNote() {
    if (!canAdd || !state.draft.trim() || saveInFlight.current) return;
    saveInFlight.current = true;
    setActionError(null);
    dispatch({ type: 'patch', patch: { saving: true } });
    try {
      const res = await fetch(`/api/customers/${customerProfileId}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: state.draft.trim() }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setActionError(typeof payload.error === 'string' ? payload.error : 'The note could not be saved. Your draft is kept.');
        return;
      }
      dispatch({ type: 'patch', patch: { draft: '', savedMsg: 'Note saved.' } });
      setEditorOpen(false);
      reload();
    } catch {
      setActionError('The save response was lost. Your draft is kept. Close this dialog and refresh the notes before saving again to avoid a duplicate.');
    } finally {
      saveInFlight.current = false;
      dispatch({ type: 'patch', patch: { saving: false } });
    }
  }

  async function deleteNote(id: string) {
    if (!canDelete || !confirm('Delete this note?')) return;
    dispatch({ type: 'patch', patch: { deletingId: id } });
    setActionError(null);
    try {
      const res = await fetch(`/api/customers/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) { setActionError('The note could not be deleted. Refresh notes to check its current state.'); return; }
      dispatch({ type: 'toggleSelected', id, checked: false });
      reload();
    } catch {
      setActionError('The delete response was lost. Refresh notes to check its current state.');
    } finally {
      dispatch({ type: 'patch', patch: { deletingId: null } });
    }
  }

  async function bulkDeleteSelected() {
    if (!canDelete || state.selectedIds.size === 0) return;
    if (!confirm(`Delete ${state.selectedIds.size} note(s)?`)) return;
    dispatch({ type: 'patch', patch: { bulkDeleting: true } });
    setActionError(null);
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
      } else { setActionError('The selected notes could not be deleted. Refresh notes to check their current state.'); }
    } catch {
      setActionError('The delete response was lost. Refresh notes to check their current state.');
    } finally {
      dispatch({ type: 'patch', patch: { bulkDeleting: false } });
    }
  }

  const { draft, saving, savedMsg, deletingId, selectedIds, bulkDeleting } = state;

  return (
    <div className="rounded-md p-4 space-y-3 border" style={{ border: '1px solid #eae8e5', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, color: '#40454a', font: "400 11.5px/1.5 'Inter',sans-serif" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p style={{ margin: 0 }} className="text-[11.5px] leading-[1.45] text-[#64686d]">{loading ? 'Loading notes…' : loadError ? 'Notes unavailable' : `${notes.length} private note${notes.length === 1 ? '' : 's'}`}</p>
        {canAdd ? <Button type="button" variant="secondary" size="sm" onClick={(event) => { event.currentTarget.focus(); setActionError(null); setEditorOpen(true); }}>
          Add note
        </Button> : null}
      </div>
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] leading-4 text-[#6f6a63]" style={{ color: '#64686d' }}>
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={bulkDeleteSelected}
              disabled={bulkDeleting}
              className="text-[11px] font-medium leading-4 text-[#64686d] rounded px-2 py-1 disabled:opacity-50"
              style={{ background: '#fdf0e6', color: '#b0431a', border: '1px solid #edc6b5' }}
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearSelected' })}
              disabled={bulkDeleting}
              className="text-[11px] font-medium leading-4 text-[#64686d]"
              style={{ color: '#64686d' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-caption" style={{ color: '#6f6a63' }}>Loading…</p>}

      {!loading && !loadError && notes.length === 0 && (
        <p className="text-caption" style={{ color: '#64686d', margin: 0 }}>
          No notes yet. Add a quick note to remind yourself &mdash; these stay private to your store.
        </p>
      )}

      {loadError ? <p role="alert" style={{ color: '#b0431a', fontSize: 12, lineHeight: 1.5 }}>Notes could not be loaded. <button type="button" onClick={reload}>Retry notes</button></p> : null}
      {actionError && !editorOpen ? <p role="alert" style={{ color: '#b0431a', fontSize: 12, lineHeight: 1.5 }}>{actionError}</p> : null}
      {notes.map((note) => {
        const checked = selectedIds.has(note.id);
        return (
          <div key={note.id} className="text-[12px] leading-[1.45] text-[#40454a] flex items-start justify-between gap-2 pb-2" style={{ borderBottom: '1px solid #eae8e5' }}>
            <label className="flex items-start gap-2 min-w-0">
              {canDelete ? <Checkbox
                checked={checked}
                onChange={(e) => {
                  dispatch({ type: 'toggleSelected', id: note.id, checked: e.target.checked });
                }}
              /> : null}
              <div className="min-w-0">
                <span className="text-[10.5px] leading-4 text-[#6f6a63] mr-2" style={{ color: '#6f6a63' }}>{formatNoteDate(note.created_at)}</span>
                <span style={{ color: '#1c1f23' }}>{note.body}</span>
              </div>
            </label>
            {canDelete ? <button
              type="button"
              onClick={() => deleteNote(note.id)}
              disabled={deletingId === note.id || bulkDeleting}
              className="text-[11px] font-medium leading-4 text-[#64686d] flex-shrink-0"
              style={{ color: '#6f6a63' }}
              title="Delete note"
            >
              &times;
            </button> : null}
          </div>
        );
      })}

      {savedMsg && <span className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#1a6b43' }}>{savedMsg}</span>}
      <Modal
        open={editorOpen}
        pending={saving}
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
        {actionError ? <p role="alert" style={{ color: '#b0431a', fontSize: 12, lineHeight: 1.5 }}>{actionError}</p> : null}
        <label style={{ display: 'block', color: '#40454a', fontSize: 13, lineHeight: 1.5 }} className="text-[13px] leading-5 text-[#40454a] block font-medium text-[#1c1f23]">
          Note
          <Textarea
            value={draft}
            onChange={(e) => dispatch({ type: 'patch', patch: { draft: e.target.value } })}
            className="mt-1 resize-none"
            placeholder="Add private context for your team…"
            rows={5}
            maxLength={2000}
            autoFocus
          />
        </label>
      </Modal>
    </div>
  );
}
