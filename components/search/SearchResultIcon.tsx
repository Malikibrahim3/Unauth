import type { UnifiedResult } from '@/components/layout/commandPaletteReducer';

export function SearchResultIcon({ type, size = 15 }: { type: UnifiedResult['type']; size?: number }) {
  const line = { fill: 'none', stroke: '#64686d', strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'customer') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="5" r="2.2" {...line}/><path d="M2.8 11.7c0-2.1 1.8-3.6 4.2-3.6s4.2 1.5 4.2 3.6" {...line}/></svg>;
  if (type === 'case' || type === 'ticket') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2 4.2h10v6.6H2zM4.2 4.2V3h5.6v1.2M5 7h4" {...line}/></svg>;
  if (type === 'shipment' || type === 'order') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><path d="M2 3.2h6.2v7.4H2zM8.2 5h2.1l1.7 2v3.6H8.2M4.2 10.6a1 1 0 1 0 0 0.1M10.2 10.6a1 1 0 1 0 0 0.1" {...line}/></svg>;
  if (type === 'loss' || type === 'recovery') return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" {...line}/><path d="M8.6 4.9H6.4a1.3 1.3 0 0 0 0 2.6h1.2a1.3 1.3 0 0 1 0 2.6H5.4" {...line}/></svg>;
  return <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true"><rect x="2.1" y="2.1" width="9.8" height="9.8" rx="2" {...line}/><path d="M4.5 7h5M7 4.5v5" {...line}/></svg>;
}

export function searchTypeLabel(type: UnifiedResult['type']) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
