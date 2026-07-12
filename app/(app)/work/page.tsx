import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { WorkQueue, type WorkQueueItem } from '@/components/work/WorkQueue';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';
import { countOpenExceptions } from '@/lib/exceptions/store';
import { AutomationCompletionCard } from '@/components/automation/AutomationCompletionCard';

export const dynamic = 'force-dynamic';

type WorkTaskRow = {
  id: string;
  title: string;
  description: string | null;
  owner_role: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  support_payout_case_id: string | null;
  blocking_reason: string | null;
};

export default async function WorkPage() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) redirect('/dashboard');

  const { data } = await serviceClient
    .from(TABLES.WORK_TASKS)
    .select('id,title,description,owner_role,status,priority,due_at,support_payout_case_id,blocking_reason')
    .eq('merchant_id', ctx.merchantId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(500);
  const rows = (data ?? []) as WorkTaskRow[];
  const items: WorkQueueItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    ownerRole: row.owner_role,
    status: row.status,
    priority: row.priority,
    dueAt: row.due_at,
    supportPayoutCaseId: row.support_payout_case_id,
    blockingReason: row.blocking_reason,
  }));

  const open = items.filter((t) => t.status === 'open').length;
  const blocked = items.filter((t) => t.status === 'blocked').length;
  const completed = items.filter((t) => t.status === 'completed').length;
  const openExceptions = await countOpenExceptions(serviceClient, ctx.merchantId);

  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Work"
      subtitle="Every open task across payout cases, losses, and recoveries — with its owner, deadline, and what it's blocked on."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="work"
      kpiItems={[
        { label: 'Open tasks', value: open.toLocaleString(), hint: 'Awaiting action' },
        { label: 'Blocked', value: blocked.toLocaleString(), hint: 'Waiting on evidence or a decision' },
        { label: 'Completed', value: completed.toLocaleString(), hint: 'Closed out' },
        { label: 'Exceptions', value: openExceptions.toLocaleString(), hint: 'Focused merchant decisions' },
      ]}
      main={<div className="space-y-8"><AutomationCompletionCard /><WorkQueue items={items} nowMs={Date.now()} /><section><div className="mb-3 flex items-baseline justify-between"><h2 className="text-base font-semibold">Exception queue</h2><Link href="/exceptions" className="text-sm underline">Open queue</Link></div><ExceptionQueue compact /></section></div>}
      footer={
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Tasks are created by the accountability workflow and recovery routing. Completing a task records an outcome and, where money is recovered, updates the financial ledger.
        </p>
      }
    />
  );
}
