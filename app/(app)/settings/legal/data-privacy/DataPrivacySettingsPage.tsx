import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Database, FileCheck2, ShieldCheck, Trash2 } from 'lucide-react';
import { PERMISSIONS } from '@/lib/permissions';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';
import SubjectErasureClient from '@/components/settings/SubjectErasureClient';
import { InsetGroup, JoinedSection, Surface } from '@/components/ui';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';

const FLOW = [
  { icon: Database, title: 'Connected sources', detail: 'Commerce, helpdesk, evidence, decision, and recovery facts enter from merchant-approved sources.' },
  { icon: ShieldCheck, title: 'Workspace-scoped case context', detail: 'Identifiers link records only inside your workspace so a customer history cannot become a shared denial list.' },
  { icon: FileCheck2, title: 'Operational and audit records', detail: 'Case review uses the linked context. Decisions, exports, and sensitive actions retain an append-only audit path.' },
];

export default async function DataPrivacySettingsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (!ctx) redirect('/settings');

  return (
    <SettingsPageShell title="Data & privacy" subtitle="Understand how merchant and customer data is scoped, retained, and removed.">
      <Surface structure="working" aria-label="Data and privacy controls">
        <JoinedSection className="p-4 sm:p-5">
          <h2 className="ua-text-section-title">How case data moves</h2>
          <p className="ua-text-caption-role mt-1">The reading order follows the data flow. Each stage remains scoped to your workspace.</p>
          <ol className="mt-4 grid gap-3" aria-label="Data flow">
            {FLOW.map(({ icon: Icon, title, detail }, index) => <li key={title} className="flex gap-3"><span className="ua-text-label grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--ua-accent-200)] bg-[var(--ua-accent-50)] text-[var(--ua-accent-700)]">{index + 1}</span><div className="min-w-0"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-[var(--ua-icon-secondary)]" aria-hidden /><h3 className="ua-text-working-title">{title}</h3></div><p className="ua-text-caption-role mt-1">{detail}</p></div></li>)}
          </ol>
        </JoinedSection>

        <JoinedSection className="p-4 sm:p-5">
          <h2 className="ua-text-section-title">Retention and workspace removal</h2>
          <p className="ua-text-caption-role mt-1">Only raw ingestion payloads with an explicit deadline are automatically removed after terminal processing. Canonical case, financial, evidence, and audit records do not receive an inferred legal retention period.</p>
          <InsetGroup className="mt-4 p-3"><div className="flex gap-2"><Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ua-icon-secondary)]" aria-hidden /><p className="ua-text-body text-[var(--ua-text-secondary)]">Removing workspace context hides the selected items from active views. It does not erase customer data or remove financial and audit accountability.</p></div></InsetGroup>
          <div className="mt-4"><BulkDeleteClient /></div>
        </JoinedSection>

        <JoinedSection className="p-4 sm:p-5">
          <h2 className="ua-text-section-title">Customer data erasure</h2>
          <SubjectErasureClient />
        </JoinedSection>

        <JoinedSection className="p-4 sm:p-5">
          <h2 className="ua-text-section-title">Audit and legal records</h2>
          <p className="ua-text-caption-role mt-1">User actions, claim decisions, evidence attachments, and exports are retained in an append-only audit trail for compliance review.</p>
          <div className="ua-text-label mt-3 flex flex-wrap gap-x-4 gap-y-2"><Link href="/settings/governance/audit-trail" className="text-[var(--ua-text-link)] hover:underline">View audit trail</Link><Link href="/legal/privacy" className="text-[var(--ua-text-link)] hover:underline">Privacy policy</Link><Link href="/legal/data-handling" className="text-[var(--ua-text-link)] hover:underline">Data handling</Link><Link href="/legal/dpa" className="text-[var(--ua-text-link)] hover:underline">Data processing agreement</Link></div>
        </JoinedSection>
      </Surface>
    </SettingsPageShell>
  );
}
