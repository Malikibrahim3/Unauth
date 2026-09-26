import type { ReactNode } from 'react';
import { AuthenticatedPageHeader, type Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';

export type PageFrameProps = { title?: string; eyebrow?: string; subtitle?: ReactNode; breadcrumbs?: Breadcrumb[]; meta?: ReactNode; tabs?: ReactNode; actions?: ReactNode; headerCapabilityId?: string; showCurrentBreadcrumb?: boolean; metrics?: ReactNode; primaryVisual?: ReactNode; toolbar?: ReactNode; children: ReactNode; footer?: ReactNode; className?: string; surfaceId?: string; archetype?: string; };

export function PageFrame({ title, eyebrow, subtitle, breadcrumbs, meta, tabs, actions, headerCapabilityId, showCurrentBreadcrumb, metrics, primaryVisual, toolbar, children, footer, className: _className, surfaceId, archetype }: PageFrameProps) {
  return <div data-screen-label={title} data-visual-world="supplied-package" data-surface-id={surfaceId} data-archetype={archetype} style={{ display: 'flex', width: '100%', maxWidth: '100%', minHeight: '100%', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
    {title ? <AuthenticatedPageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} meta={meta} tabs={tabs} actions={actions} capabilityId={headerCapabilityId} showCurrentBreadcrumb={showCurrentBreadcrumb}/> : null}
    <div style={{ width: '100%', minHeight: 0, flex: 1, padding: '14px 22px 16px', background: '#fff' }}><div style={{ display: 'grid', minWidth: 0, gap: 14, overflowX: 'hidden' }}>{metrics}{primaryVisual}{toolbar}{children}{footer ? <footer style={{ color: '#6f6a63', font: "400 10.5px/1.5 'IBM Plex Mono',monospace" }}>{footer}</footer> : null}</div></div>
  </div>;
}
