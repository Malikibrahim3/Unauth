import { z } from 'zod';

export const WORK_VIEWS = [
  'open',
  'mine',
  'unassigned',
  'snoozed',
  'overdue',
  'due-today',
  'no-sla',
  'blocked',
  'evidence-needed',
  'decision-needed',
  'integration-exceptions',
  'age-0-1',
  'age-1-3',
  'age-4-7',
  'age-8-plus',
  'completed',
] as const;

export type WorkView = (typeof WORK_VIEWS)[number];

export const WORK_SORTS = ['deadline', 'priority', 'oldest', 'newest'] as const;
export type WorkSort = (typeof WORK_SORTS)[number];

export const WORK_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
export type WorkPriority = (typeof WORK_PRIORITIES)[number];

export const WORK_TASK_STATES = ['open', 'in_progress', 'blocked', 'completed'] as const;
export type WorkTaskState = (typeof WORK_TASK_STATES)[number];

export const WORK_ACTIONS = [
  'assign_to_me',
  'release',
  'start',
  'snooze',
  'complete',
  'reopen',
] as const;
export type WorkAction = (typeof WORK_ACTIONS)[number];

export type WorkItemKind = 'task' | 'exception';

export type WorkViewCounts = Record<
  | 'open'
  | 'mine'
  | 'unassigned'
  | 'snoozed'
  | 'due-today'
  | 'overdue'
  | 'no-sla'
  | 'blocked'
  | 'evidence-needed'
  | 'decision-needed'
  | 'integration-exceptions'
  | 'completed',
  number
>;

export type WorkQueueItem = {
  id: string;
  key: string;
  kind: WorkItemKind;
  title: string;
  description: string | null;
  ownerRole: string | null;
  ownerUserId: string | null;
  ownerName?: string | null;
  ownerInitials?: string | null;
  status: string;
  priority: WorkPriority;
  dueAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  stateVersion: number;
  taskKind: string;
  waitingParty: string | null;
  supportPayoutCaseId: string | null;
  lossCaseId: string | null;
  recoveryCaseId: string | null;
  objectHref: string | null;
  objectLabel: string;
  blockingReason: string | null;
  source: string | null;
  sourceMetadata: Record<string, unknown>;
  exceptionType?: string | null;
  exceptionContext?: Record<string, unknown> | null;
  exceptionStateVersion?: number | null;
  deadlineKind?: string | null;
  validActions: WorkAction[];
};

export type WorkQueuePage = {
  items: WorkQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  viewCounts: WorkViewCounts;
  source: 'canonical_rpc' | 'bounded_compatibility';
  notice: string | null;
};

export const workSavedViewDefinitionSchema = z.object({
  view: z.enum(WORK_VIEWS).default('open'),
  search: z.string().trim().max(160).default(''),
  priority: z.enum(WORK_PRIORITIES).nullable().default(null),
  state: z.enum(WORK_TASK_STATES).nullable().default(null),
  assignee: z.string().trim().max(80).nullable().default(null),
  sort: z.enum(WORK_SORTS).default('deadline'),
}).strict();

export type WorkSavedViewDefinition = z.infer<typeof workSavedViewDefinitionSchema>;

export type WorkQueueFilters = WorkSavedViewDefinition & {
  page: number;
  pageSize: number;
};

export function normaliseWorkView(value: string | null | undefined): WorkView {
  return WORK_VIEWS.includes(value as WorkView) ? value as WorkView : 'open';
}

export function normaliseWorkSort(value: string | null | undefined): WorkSort {
  return WORK_SORTS.includes(value as WorkSort) ? value as WorkSort : 'deadline';
}

export function normaliseWorkPriority(value: string | null | undefined): WorkPriority | null {
  return WORK_PRIORITIES.includes(value as WorkPriority) ? value as WorkPriority : null;
}

export function normaliseWorkState(value: string | null | undefined): WorkTaskState | null {
  return WORK_TASK_STATES.includes(value as WorkTaskState) ? value as WorkTaskState : null;
}

export function validWorkActions(input: {
  item: Pick<WorkQueueItem, 'kind' | 'status' | 'ownerUserId' | 'snoozedUntil'>;
  currentUserId: string;
  canManage: boolean;
  canManageAnyAssignment: boolean;
  nowMs: number;
}): WorkAction[] {
  const { item, currentUserId, canManage, canManageAnyAssignment, nowMs } = input;
  if (!canManage || item.kind !== 'task') return [];

  const actions: WorkAction[] = [];
  const ownedByCurrentUser = item.ownerUserId === currentUserId;
  const unassigned = item.ownerUserId == null;
  const canOperateOwnedTask = ownedByCurrentUser || unassigned || canManageAnyAssignment;
  const snoozed = item.snoozedUntil != null
    && Number.isFinite(Date.parse(item.snoozedUntil))
    && Date.parse(item.snoozedUntil) > nowMs;

  if (!['completed', 'cancelled'].includes(item.status)) {
    if (unassigned) actions.push('assign_to_me');
    if (item.ownerUserId && (ownedByCurrentUser || canManageAnyAssignment)) actions.push('release');
  }
  if (['open', 'blocked'].includes(item.status) && canOperateOwnedTask && !snoozed) actions.push('start');
  if (['open', 'in_progress', 'blocked'].includes(item.status) && canOperateOwnedTask) actions.push('snooze');
  if (item.status === 'in_progress' && canOperateOwnedTask) actions.push('complete');
  if (item.status === 'completed') actions.push('reopen');
  return [...new Set(actions)];
}
