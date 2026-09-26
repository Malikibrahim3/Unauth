'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type SavedView = { id: string; name: string; definition: Record<string, string>; is_shared?: boolean };

const field = { border: '1px solid #d8d4cf', borderRadius: 8, background: '#fff', color: '#1c1f23', font: "400 12px/1 'Inter',sans-serif", padding: '7px 9px' } as const;
const button = { ...field, cursor: 'pointer' } as const;

export function SavedWorkViews() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState(searchParams.get('savedView') ?? '');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function reload() {
    const response = await fetch('/api/work/views');
    if (!response.ok) return;
    const body = await response.json() as { views?: SavedView[] };
    setViews(body.views ?? []);
  }

  useEffect(() => { void reload(); }, []);

  async function save() {
    const definition = Object.fromEntries(['view', 'search', 'priority', 'state', 'assignee', 'sort'].flatMap((key) => {
      const value = searchParams.get(key);
      return value ? [[key, value]] : [];
    }));
    const response = await fetch('/api/work/views', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), definition, isShared: false }) });
    if (!response.ok) return;
    const body = await response.json() as { view: SavedView };
    setViews((current) => [...current, body.view]);
    setSelected(body.view.id);
    setOpen(false);
  }

  function apply(id: string) {
    setSelected(id);
    const view = views.find((candidate) => candidate.id === id);
    const next = new URLSearchParams(searchParams.toString());
    next.set('savedView', id);
    for (const [key, value] of Object.entries(view?.definition ?? {})) next.set(key, value);
    router.push(`/work?${next.toString()}`);
  }

  async function remove() {
    if (!selected) return;
    const response = await fetch(`/api/work/views/${encodeURIComponent(selected)}`, { method: 'DELETE' });
    if (!response.ok) return;
    setViews((current) => current.filter((view) => view.id !== selected));
    setSelected('');
    const next = new URLSearchParams(searchParams.toString());
    next.delete('savedView');
    router.push(`/work?${next.toString()}`);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 22px', borderBottom: '1px solid #e4e3e0', background: '#ffffff' }}>
      <select aria-label="Saved Work view" value={selected} onChange={(event) => apply(event.target.value)} style={field}>
        <option value="">Saved views</option>
        {views.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
      </select>
      <button type="button" onClick={() => setOpen(true)} style={button}>Save view</button>
      {selected ? <button type="button" onClick={() => void remove()} style={button}>Delete</button> : null}
      {open ? (
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div role="dialog" aria-modal="true" aria-label="Save Work view" style={{ width: 420, padding: 18, borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, font: "500 12px/1.3 'Inter',sans-serif" }}>Saved view name<input aria-label="Saved view name" value={name} onChange={(event) => setName(event.target.value)} style={field}/></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}><button type="button" onClick={() => setOpen(false)} style={button}>Cancel</button><button type="button" disabled={!name.trim()} onClick={() => void save()} style={{ ...button, background: '#1c1f23', color: '#fff' }}>Save</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
