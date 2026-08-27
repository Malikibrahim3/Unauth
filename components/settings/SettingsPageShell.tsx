import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Breadcrumb } from '@/components/authenticated/AuthenticatedPageHeader';
import { PageFrame } from '@/components/ui/PageFrame';
import { HandoffSettingsNav } from '@/components/settings/HandoffSettingsNav';
import styles from '@/components/settings/OperationsSettings.module.css';

export type SettingsTruth = {
  access: string;
  currentState: string;
  saveBehavior: string;
  impact: string;
};

interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  meta?: ReactNode;
  tabs?: ReactNode;
  children: ReactNode;
  className?: string;
  surfaceId?: string;
  layout?: 'form' | 'wide';
  truth: SettingsTruth;
}

/**
 * Instrument Grade configuration-document shell.
 *
 * The settings family is "Header → grouped local navigation → 680–820px form →
 * contextual help only when specific". Grouped navigation is owned by the
 * settings layout (`SettingsNav`); this shell renders the header and a single
 * readable form column capped at 820px.
 *
 * The prior shell hung a fixed "Workspace controls" guidance card plus a
 * "Settings help" link on every page — a generic rail repeated across ~12
 * settings routes, which §5.5 explicitly removes. Contextual help now belongs
 * inline within a page's own content, and only when it is specific to that page.
 */
export function SettingsPageShell({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  meta,
  tabs,
  children,
  className,
  surfaceId,
  layout = 'form',
  truth,
}: SettingsPageShellProps) {
  return (
    <PageFrame
      className={cn('min-w-0', className)}
      surfaceId={surfaceId}
      archetype="P10"
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      breadcrumbs={breadcrumbs ?? [
        { label: 'Settings', href: '/settings/workspace/account' },
        { label: title },
      ]}
      showCurrentBreadcrumb
      actions={
        primaryAction || secondaryActions?.length
          ? <>{secondaryActions}{primaryAction}</>
          : undefined
      }
      meta={meta}
      tabs={tabs}
      headerCapabilityId="operations-settings"
    >
      <div className="ua-handoff-settings-layout">
        <HandoffSettingsNav />
        <div
          className={cn('ua-settings-form', layout === 'wide' && 'ua-settings-form--wide')}
          data-settings-document={surfaceId ?? 'settings'}
        >
          <section className={styles.settingsTruth} aria-label="Setting authority and impact">
            <dl>
              <div><dt>Who can change it</dt><dd>{truth.access}</dd></div>
              <div><dt>Current state</dt><dd>{truth.currentState}</dd></div>
              <div><dt>Save behavior</dt><dd>{truth.saveBehavior}</dd></div>
              <div><dt>Impact</dt><dd>{truth.impact}</dd></div>
            </dl>
          </section>
          {children}
        </div>
      </div>
    </PageFrame>
  );
}
