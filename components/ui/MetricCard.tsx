'use client';
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useChangedValueHighlight } from '@/lib/design/useChangedValueHighlight';
import { UnavailableValue, type ValueAvailability } from './ProductValue';
export type MetricKind = 'money' | 'count' | 'rate' | 'duration'; export type MetricOutcome = 'prevented' | 'recovered' | 'realised' | 'open' | 'identified'; export type MetricAvailability = ValueAvailability | 'verified-zero';
export interface MetricDelta { value: string; direction: 'up' | 'down' | 'flat'; label: string; }
export interface MetricCardProps { label: string; value: ReactNode; kind?: MetricKind; availability?: MetricAvailability; unit?: string; detail?: ReactNode; delta?: MetricDelta; outcome?: MetricOutcome; icon?: LucideIcon; href?: string; density?: 'default' | 'compact'; size?: 'hero'; microchart?: ReactNode; }
const DELTA_ICON: Record<MetricDelta['direction'], typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, flat: Minus };
export function MetricCard({ label, value, kind = 'count', availability = 'available', unit, detail, delta, outcome, icon: Icon, href, density = 'default', size, microchart }: MetricCardProps) {
  const isHero = size === 'hero'; const highlightKey = typeof value === 'string' || typeof value === 'number' ? value : null; const highlighting = useChangedValueHighlight(highlightKey); const isAvailable = availability === 'available' || availability === 'verified-zero';
  const body = <div className={cn('relative min-w-0 rounded-xl border border-[#e4e3e0] bg-white', density === 'compact' ? 'p-3' : 'p-4', isHero && 'p-5', href && 'transition-colors hover:bg-[#ffffff]')}>
    {outcome ? <span className={cn('absolute left-0 top-4 h-5 w-[3px] rounded-r', outcome === 'prevented' && 'bg-[#1a6b43]', outcome === 'recovered' && 'bg-[#315e8a]', outcome === 'realised' && 'bg-[#b0431a]', (outcome === 'open' || outcome === 'identified') && 'bg-[#c58a24]')} aria-hidden="true" /> : null}
    <div className="flex items-start justify-between gap-2"><span className="text-[10.5px] font-medium leading-4 text-[#64686d]">{label}</span>{Icon ? <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#6f6a63]" /> : null}</div>
    <div className={cn('mt-2 font-mono text-[20px] font-normal leading-none tabular-nums text-[#1c1f23]', kind === 'money' && 'tracking-[-.025em]', isHero && 'text-[26px]', highlighting && 'animate-pulse')}>{isAvailable ? <>{value}{availability === 'verified-zero' ? <span className="sr-only">, verified zero</span> : null}</> : <UnavailableValue kind={availability} placement="metric" />}{unit && isAvailable ? <span className="ml-1 text-[11px] text-[#64686d]">{unit}</span> : null}</div>
    {delta && isAvailable ? (() => { const DeltaIcon = DELTA_ICON[delta.direction]; return <div className={cn('mt-2 flex items-center gap-1 text-[10.5px]', delta.direction === 'up' ? 'text-[#1a6b43]' : delta.direction === 'down' ? 'text-[#b0431a]' : 'text-[#64686d]')}><DeltaIcon size={11} aria-hidden="true" /><span>{delta.value}</span><span className="sr-only">{delta.label}</span></div>; })() : null}
    {isHero && microchart ? <div className="mt-3" aria-hidden="true">{microchart}</div> : null}{detail ? <p className="mb-0 mt-2 text-[10.5px] leading-[1.45] text-[#64686d]">{detail}</p> : null}
  </div>; return href ? <a href={href} className="block text-inherit no-underline">{body}</a> : body;
}
