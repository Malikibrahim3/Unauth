import { redirect } from 'next/navigation';
import { WorkbenchPage } from '@/components/ui';
import { WorkQueueOperations } from '@/components/work/WorkQueueOperations';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { now } from '@/lib/time/clock';
import { loadWorkOwnerDirectory } from '@/lib/work/owners';
import { loadWorkQueuePage } from '@/lib/work/store';
import {
  normaliseWorkPriority,
  normaliseWorkSort,
  normaliseWorkState,
  normaliseWorkView,
} from '@/lib/work/types';

export const dynamic = 'force-dynamic';

type WorkSearchParams = {
  view?: string;
  page?: string;
  search?: string;
  q?: string;
  priority?: string;
  state?: string;
  assignee?: string;
  sort?: string;
  savedView?: string;
  selected?: string;
};

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<WorkSearchParams>;
}) {
  const [user, ctx] = await Promise.all([
    getRequestUser(),
    requirePagePermission(PERMISSIONS.VIEW_INBOX),
  ]);
  if (!user) redirect('/login');
  if (!ctx) redirect('/overview');

  const serviceClient = getRequestServiceClient();
  const params = await searchParams;
  const referenceTime = now();
  const filters = {
    view: normaliseWorkView(params.view),
    search: (params.search ?? params.q ?? '').trim().slice(0, 160),
    priority: normaliseWorkPriority(params.priority),
    state: normaliseWorkState(params.state),
    assignee: params.assignee?.trim().slice(0, 80) || null,
    sort: normaliseWorkSort(params.sort),
    page: Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1),
    pageSize: 25,
  };
  const [canManage, canManageViews, ownerDirectory] = await Promise.all([
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_WORK),
    hasPermission(serviceClient, ctx, PERMISSIONS.MANAGE_WORK_VIEWS),
    loadWorkOwnerDirectory(serviceClient, ctx.merchantId),
  ]);
  const canManageAnyAssignment = ctx.role === 'owner' || ctx.role === 'admin';
  const result = await loadWorkQueuePage({
    client: serviceClient,
    merchantId: ctx.merchantId,
    currentUserId: user.id,
    canManage,
    canManageAnyAssignment,
    filters,
    asOf: referenceTime,
  });
  const items = result.items.map((item) => {
    const owner = item.ownerUserId ? ownerDirectory.get(item.ownerUserId) : null;
    return {
      ...item,
      ownerName: owner?.name ?? null,
      ownerInitials: owner?.initials ?? null,
      ownerRole: owner?.role ?? item.ownerRole,
    };
  });

  return (
    <WorkbenchPage
      title="Work"
      subtitle="One source-backed queue for tasks, exceptions and external handoffs."
      surfaceId="work-queue"
      archetype="P5/P6"
      main={(
        <WorkQueueOperations
          items={items}
          total={result.total}
          view={filters.view}
          viewCounts={result.viewCounts}
          page={result.page}
          pageSize={result.pageSize}
          asOf={referenceTime.toISOString()}
          initialQuery={filters.search}
          currentUserId={user.id}
          canManage={canManage}
          canManageViews={canManageViews}
          sourceNotice={result.notice}
          savedViewId={params.savedView ?? null}
        />
      )}
      mainSurface="open"
    />
  );
}
