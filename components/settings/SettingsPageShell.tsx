import type { ReactNode } from 'react';
import type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
import { HandoffSettingsNav } from '@/components/settings/HandoffSettingsNav';

export type SettingsTruth = { access: string; currentState: string; saveBehavior: string; impact: string };
interface SettingsPageShellProps {
  title: string; subtitle?: string; eyebrow?: string; breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode; secondaryActions?: ReactNode[]; meta?: ReactNode; tabs?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode; className?: string; surfaceId?: string; layout?: 'form' | 'wide'; truth: SettingsTruth;
  workspaceName?: string | null;
  workspaceCreatedLabel?: string | null;
}

export function SettingsPageShell({ title, subtitle, primaryAction, secondaryActions, meta, tabs, toolbar, children, className: _className, surfaceId, layout = 'form', truth, workspaceName, workspaceCreatedLabel }: SettingsPageShellProps) {
  return <>
    {toolbar ?? <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
      <p style={{ maxWidth: 760, margin: 0, color: '#64686d', font: "400 12.5px/1.5 'Inter',sans-serif" }}>{subtitle ?? truth.impact}</p>
      <span style={{ flex: 1 }}/>{meta ? <span style={{ color: '#64686d', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{meta}</span> : null}
      {secondaryActions}{primaryAction}
    </div>}
    {tabs ? <div style={{ minHeight: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>{tabs}</div> : null}
    <div data-screen-label={title} data-visual-world="supplied-package" data-surface-id={surfaceId} data-archetype="P10" style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 16, overflow: 'hidden' }}>
      <HandoffSettingsNav workspaceName={workspaceName} workspaceCreatedLabel={workspaceCreatedLabel}/>
      <div role="region" aria-label={`${title} settings`} tabIndex={0} data-settings-document={surfaceId ?? 'settings'} style={{ flex: 1, width: layout === 'wide' ? '100%' : 'auto', maxWidth: '100%', minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'grid', gridAutoRows: 'max-content', alignContent: 'start', gap: 12 }}>
        <dl className="sr-only" aria-label="Setting authority and impact"><dt>Who can change it</dt><dd>{truth.access}</dd><dt>Current state</dt><dd>{truth.currentState}</dd><dt>Save behavior</dt><dd>{truth.saveBehavior}</dd><dt>Impact</dt><dd>{truth.impact}</dd></dl>
        {children}
      </div>
    </div>
  </>;
}
