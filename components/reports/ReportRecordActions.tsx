'use client';

import { useState } from 'react';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";

export function ReportRecordActions({
  controlEntries,
  search,
  sort,
  pageSize,
  metricDefinition,
  exportHref,
  exportLabel,
  filterDisabled = false,
}: {
  controlEntries: Array<[string, string]>;
  search: string;
  sort: string;
  pageSize: number;
  metricDefinition: string;
  exportHref: string | null;
  exportLabel: string;
  filterDisabled?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyDefinition() {
    try {
      await navigator.clipboard.writeText(metricDefinition);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
    <button type="button" disabled={filterDisabled} onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: filterDisabled ? '#64686d' : '#64686d', cursor: filterDisabled ? 'default' : 'pointer', font: `400 12.5px/1 ${sans}` }}>Filter rows</button>
    <button type="button" onClick={copyDefinition} style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', cursor: 'pointer', font: `400 12.5px/1 ${sans}` }}>{copied ? 'Definition copied' : 'Copy metric definition'}</button>
    {exportHref ? <a href={exportHref} style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', textDecoration: 'none', font: `500 12.5px/1 ${sans}` }}>{exportLabel}</a> : <span aria-disabled="true" title="An export endpoint is unavailable for this scope" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', opacity: .62, font: `500 12.5px/1 ${sans}` }}>{exportLabel}</span>}
    {filterOpen ? <form method="get" action="/financials/reports/records" style={{ position: 'absolute', zIndex: 12, top: 36, right: 0, width: 420, padding: 12, borderRadius: 10, background: '#fff', boxShadow: '0 10px 32px rgba(28,27,25,.18),0 0 0 1px rgba(28,27,25,.07)', display: 'grid', gridTemplateColumns: '1fr 126px 92px auto', gap: 8 }}>
      {controlEntries.map(([key, value]) => <input key={key} type="hidden" name={key} value={value}/>) }
      <input name="search" defaultValue={search} aria-label="Search supporting records" placeholder="Search rows" style={{ minWidth: 0, height: 30, padding: '0 9px', border: 0, borderRadius: 7, outline: 0, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)', color: '#1c1f23', font: `400 11px/1 ${sans}` }}/>
      <select name="sort" defaultValue={sort} aria-label="Sort supporting records" style={{ height: 30, padding: '0 7px', border: 0, borderRadius: 7, outline: 0, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)', background: '#fff', color: '#40454a', font: `400 10.5px/1 ${sans}` }}><option value="updated_desc">Newest updated</option><option value="updated_asc">Oldest updated</option><option value="amount_desc">Highest amount</option><option value="amount_asc">Lowest amount</option></select>
      <select name="pageSize" defaultValue={String(pageSize)} aria-label="Supporting records per page" style={{ height: 30, padding: '0 7px', border: 0, borderRadius: 7, outline: 0, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)', background: '#fff', color: '#40454a', font: `400 10.5px/1 ${sans}` }}><option value="25">25 rows</option><option value="50">50 rows</option><option value="100">100 rows</option></select>
      <button type="submit" style={{ height: 30, padding: '0 10px', border: 0, borderRadius: 7, background: '#1c1f23', color: '#fff', cursor: 'pointer', font: `500 11px/1 ${sans}` }}>Apply</button>
      <span style={{ gridColumn: '1 / -1', color: '#64686d', font: `400 9.5px/1.4 ${mono}` }}>Search applies to the loaded page; ordering remains source-backed where the query supports it.</span>
    </form> : null}
  </div>;
}
