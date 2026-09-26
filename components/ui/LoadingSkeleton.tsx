'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { DELAY } from '@/lib/design/motion';

export type LoadingSkeletonVariant = 'shell' | 'page' | 'metric-group' | 'table' | 'detail' | 'drawer' | 'form' | 'chart' | 'header' | 'panel';

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  rows?: number;
  title?: string;
  className?: string;
  style?: CSSProperties;
  announce?: boolean;
  delayMs?: number;
};

const stack = (gap: number): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap });
const roundedPanel: CSSProperties = { overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 12 };

export function Bone({ className: _className, style }: { className?: string; style?: CSSProperties }) {
  return <div style={{ minHeight: 8, borderRadius: 8, background: '#eae8e5', ...style }} aria-hidden="true" />;
}

function useSlowLoadNotice(active: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), DELAY.slowLoadNotice);
    return () => clearTimeout(timer);
  }, [active]);
  return slow;
}

export function LoadingSkeleton({
  variant = 'page',
  rows = 6,
  title = 'Loading workspace',
  className: _className,
  style,
  announce = true,
  delayMs = DELAY.skeleton,
}: LoadingSkeletonProps) {
  const [visible, setVisible] = useState(delayMs <= 0);
  const slow = useSlowLoadNotice(announce);

  useEffect(() => {
    if (delayMs <= 0) return;
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const stateProps = { 'aria-busy': true, 'aria-label': title, 'data-skeleton-variant': variant } as const;
  const announcement = announce ? <>
    <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} role="status">{title}</span>
    {slow ? <p style={{ margin: 0, color: '#6f6a63', fontSize: 11 }}>This is taking longer than expected.</p> : null}
  </> : null;

  if (!visible) return <div style={style} {...stateProps}>{announcement}</div>;

  if (variant === 'shell') return <div style={{ ...stack(16), minHeight: '100vh', padding: 16, ...style }} {...stateProps}><Bone style={{ width: '100%', height: 40 }} /><div style={{ display: 'flex', gap: 16 }}><Bone style={{ width: 224, height: 'calc(100vh - 6rem)', flexShrink: 0 }} /><div style={{ ...stack(16), minWidth: 0, flex: 1 }}><Bone style={{ width: 224, height: 32 }} /><Bone style={{ width: '100%', maxWidth: 576, height: 16 }} /><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} delayMs={0} /></div></div>{announcement}</div>;
  if (variant === 'metric-group') return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 12, background: '#e4e3e0', ...style }} {...stateProps}>{Array.from({ length: 4 }, (_, index) => <div key={index} style={{ ...stack(8), background: '#fff', padding: 16 }}><Bone style={{ width: 80, height: 12 }} /><Bone style={{ width: 64, height: 28 }} /><Bone style={{ width: 112, height: 12 }} /></div>)}{announcement}</div>;
  if (variant === 'table') return <div style={{ ...roundedPanel, ...style }} {...stateProps}><Bone style={{ width: '100%', height: 36, borderRadius: 0 }} />{Array.from({ length: rows }, (_, index) => <div key={index} style={{ display: 'flex', height: 44, alignItems: 'center', gap: 16, borderTop: '1px solid #eae8e5', padding: '0 16px' }}><Bone style={{ width: 128, height: 16 }} /><Bone style={{ width: 96, height: 16 }} /><Bone style={{ width: 64, height: 16 }} /></div>)}{announcement}</div>;
  if (variant === 'drawer') return <div style={{ ...stack(16), padding: 16, ...style }} {...stateProps}><Bone style={{ width: 192, height: 24 }} /><Bone style={{ width: '100%', height: 16 }} /><Bone style={{ width: '100%', height: 96 }} /><Bone style={{ width: '100%', height: 128 }} />{announcement}</div>;
  if (variant === 'form') return <div style={{ ...stack(16), ...style }} {...stateProps}>{Array.from({ length: Math.max(3, rows) }, (_, index) => <div key={index} style={stack(8)}><Bone style={{ width: 112, height: 12 }} /><Bone style={{ width: '100%', height: 36 }} /></div>)}<Bone style={{ width: 112, height: 36 }} />{announcement}</div>;
  if (variant === 'chart') return <div style={{ ...stack(12), ...roundedPanel, padding: 16, ...style }} {...stateProps}><Bone style={{ width: 160, height: 16 }} /><Bone style={{ width: '100%', height: 192 }} />{announcement}</div>;
  if (variant === 'header') return <div style={{ ...stack(8), padding: '16px 0', ...style }} {...stateProps}><Bone style={{ width: 160, height: 20 }} /><Bone style={{ width: '100%', maxWidth: 448, height: 12 }} />{announcement}</div>;
  if (variant === 'panel') return <div style={{ ...stack(12), ...roundedPanel, padding: 16, ...style }} {...stateProps}><Bone style={{ width: 128, height: 16 }} /><Bone style={{ width: '100%', maxWidth: 384, height: 12 }} /><Bone style={{ width: '100%', height: 80 }} />{announcement}</div>;
  if (variant === 'detail') return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16, ...style }} {...stateProps}><div style={stack(12)}>{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} style={{ width: '100%', height: 80, border: '1px solid #eae8e5', borderRadius: 12, background: '#fff' }} />)}</div><Bone style={{ width: '100%', height: 288, border: '1px solid #eae8e5', borderRadius: 12, background: '#fff' }} />{announcement}</div>;
  return <div style={{ ...stack(20), ...style }} {...stateProps}><div style={stack(8)}><Bone style={{ width: 192, height: 28 }} /><Bone style={{ width: '100%', maxWidth: 576, height: 16 }} /></div><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} delayMs={0} />{announcement}</div>;
}
