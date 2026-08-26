import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';
import SubjectErasureClient from '@/components/settings/SubjectErasureClient';
import { OperationalState } from '@/components/ui';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import styles from '@/components/settings/OperationsSettings.module.css';

const FLOW = [
  { title: 'Sources read', detail: 'Orders, tickets, shipments and payments are read from connected providers on a schedule.' },
  { title: 'Canonical records', detail: 'Unauth keeps its own copy so evidence survives a provider going stale or disconnecting.' },
  { title: 'Case evidence', detail: 'Records are attached to cases as facts, with their source and freshness kept alongside.' },
  { title: 'Ledger', detail: 'Financial consequences are written append-only and never recomputed from a later source state.' },
  { title: 'Audit history', detail: 'Consequential actions are logged with actor, object and time. No retention period may be published until the owner and counsel approve it.' },
];

const RETENTION = [
  ['Source records', 'Only rows with an explicit retention deadline are time-purged', 'Not approved'],
  ['Case evidence and findings', 'No pilot period is published', 'Not approved'],
  ['Ledger and recovery history', 'Retention exceptions must preserve reconciliation truth', 'Not approved'],
  ['Audit history', 'No pilot period is published', 'Not approved'],
  ['Customer identifiers', 'Subject erasure anonymises supported identifiers', 'Operational'],
  ['Subject access JSON', 'Generated for the response; no server-side export file is retained', 'Operational'],
] as const;

export default async function DataPrivacySettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (!ctx) redirect('/settings');
  const service = createServiceClient();
  const [canEraseCustomer, canDeleteWorkspace, merchantResult] = await Promise.all([
    hasPermission(service, ctx, PERMISSIONS.BULK_DELETE),
    hasPermission(service, ctx, PERMISSIONS.GRANT_PERMISSIONS),
    service.from(TABLES.MERCHANTS).select('name').eq('id', ctx.merchantId).maybeSingle(),
  ]);
  const workspaceName = merchantResult.data?.name ?? 'this workspace';

  return (
    <SettingsPageShell
      title="Data privacy"
      subtitle="What Unauth holds, the scoped access and erasure contract, and the one canonical workspace-deletion job. Unapproved legal periods are not published."
      surfaceId="data-privacy"
      layout="wide"
      truth={{
        access: canDeleteWorkspace ? "Owner: workspace deletion · permitted operators: subject access and erasure" : canEraseCustomer ? "Bulk delete permission: subject access and erasure · workspace deletion: owner only" : "Review only; destructive privacy actions are permission-restricted",
        currentState: "Operational access and erasure controls · retention approval remains explicitly pending",
        saveBehavior: "Exports are immediate; destructive actions require typed confirmation and a protected review step",
        impact: "Subject erasure preserves financial/audit truth; workspace deletion is irreversible and resumable by durable job",
      }}
    >
      <div className={styles.privacyStack} data-operations-surface="data-privacy">
        <section className={styles.card}>
          <div className={styles.cardHeading}><div><h2>How merchant data moves through Unauth</h2><p>Read this before using either destructive action below.</p></div></div>
          <ol className={styles.privacyFlow}>
            {FLOW.map((step, index) => <li key={step.title}><span>STEP {index + 1}</span><strong>{step.title}</strong><p>{step.detail}</p></li>)}
          </ol>
        </section>

        <div className={styles.privacyTwoUp}>
          <section className={styles.card}>
            <div className={styles.cardHeading}><div><h2>Pilot retention approval gate</h2><p>These are implemented data-handling rules, not a counsel-approved public retention schedule. External release stays blocked until the schedule and lawful purposes are approved.</p></div></div>
            <div className={styles.retentionTable} role="table" aria-label="Data retention">
              <div role="row" className={styles.retentionHeader}><span role="columnheader">Data</span><span role="columnheader">Current product rule</span><span role="columnheader">Approval</span></div>
              {RETENTION.map(([data, retention, approval]) => <div role="row" className={styles.retentionRow} key={data}><span role="cell" title={data}>{data}</span><span role="cell">{retention}</span><span role="cell"><em data-tone={approval === 'Operational' ? 'positive' : 'muted'}>{approval}</em></span></div>)}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}><div><h2>Erase a customer</h2><p>Removes personal data while keeping the financial record intact.</p></div></div>
            {canEraseCustomer ? <SubjectErasureClient /> : <OperationalState kind="permission" title="Customer erasure is restricted" description="Your role can review privacy controls, but Bulk delete permission is required to request or confirm customer erasure." />}
          </section>
        </div>

        <section className={styles.card}>
          {canDeleteWorkspace ? <BulkDeleteClient workspaceName={workspaceName} /> : <OperationalState kind="permission" title="Workspace deletion is owner-only" description="Only the workspace owner can delete the workspace, its records and its audit history." />}
        </section>

        <div className={styles.privacyLinks}><Link href="/settings/governance/audit-trail">Export the audit trail</Link><Link href="/financials/reports/records">Export supporting records</Link><Link href="/settings/workspace/team">Transfer ownership</Link><Link href="/legal/data-handling">Read data handling</Link></div>
      </div>
    </SettingsPageShell>
  );
}
