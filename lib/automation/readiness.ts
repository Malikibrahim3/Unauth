import type { ConnectionSyncState } from '@/lib/integrations/syncState';

export const READINESS_WEIGHTS = {
  caseCreation: 0.3,
  evidenceCollection: 0.25,
  financialReconciliation: 0.25,
  recoveryAutomation: 0.2,
} as const;

export type ReadinessCategoryKey = keyof typeof READINESS_WEIGHTS;
export type ReadinessSignal = {
  connected: boolean;
  syncState?: ConnectionSyncState;
};

export type ReadinessInputs = {
  commerce: ReadinessSignal;
  helpdesk: ReadinessSignal;
  tracking: ReadinessSignal;
  payments: ReadinessSignal;
  warehouse: ReadinessSignal;
  activeRules: number;
  unresolvedExceptions: number;
  financialExceptions: number;
  recoveryTasks: number;
  activityCount: number;
};

export type ReadinessAction = { label: string; href: string; impact: number };
export type ReadinessCategory = {
  key: ReadinessCategoryKey;
  label: string;
  score: number;
  explanation: string;
  action: ReadinessAction | null;
};

export type ReadinessResult = {
  score: number;
  band: 'Ready' | 'Nearly ready' | 'Needs setup' | 'Limited automation';
  categories: ReadinessCategory[];
  dataQuality: 'Healthy' | 'Mostly healthy' | 'Needs attention' | 'Incomplete';
  workload: string;
  recommendation: ReadinessAction | null;
  earlyStage: boolean;
  readyAreas: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const healthy = (signal: ReadinessSignal) => signal.connected && !['sync_failed', 'attention_required', 'stale', 'disconnected'].includes(signal.syncState ?? 'import_complete');
const live = (signal: ReadinessSignal) => signal.connected && signal.syncState !== 'sync_failed' && signal.syncState !== 'disconnected';
const repairAction = (signal: ReadinessSignal, label: string, href: string, impact: number): ReadinessAction => signal.connected
  ? { label: `Repair ${label}`, href, impact }
  : { label: `Connect ${label}`, href, impact };

export function calculateAutomationReadiness(input: ReadinessInputs): ReadinessResult {
  const commerce = healthy(input.commerce);
  const helpdesk = healthy(input.helpdesk);
  const tracking = healthy(input.tracking);
  const payments = healthy(input.payments);
  const warehouse = healthy(input.warehouse);

  const exceptionPenalty = Math.min(20, input.unresolvedExceptions * 2);
  const financialPenalty = Math.min(20, input.financialExceptions * 4);
  const recoveryPenalty = Math.min(20, input.recoveryTasks * 2);

  const categories: ReadinessCategory[] = [
    {
      key: 'caseCreation', label: 'Automatic case creation',
      score: clamp((commerce ? 55 : 0) + (helpdesk ? 35 : 0) + (input.activeRules > 0 ? 10 : 0) - exceptionPenalty),
      explanation: !commerce ? 'Orders are not available yet.' : !helpdesk ? 'Orders are ready, but support conversations are unavailable.' : input.activeRules < 1 ? 'Sources are ready; create a rule to route cases automatically.' : 'Orders and support events can create and update cases.',
      action: !commerce ? repairAction(input.commerce, 'Shopify', '/settings/integrations/shopify', 55) : !helpdesk ? repairAction(input.helpdesk, 'your helpdesk', '/integrations#connections', 35) : input.activeRules < 1 ? { label: 'Configure your first rule', href: '/rules', impact: 10 } : input.unresolvedExceptions > 0 ? { label: 'Review matching exceptions', href: '/exceptions', impact: exceptionPenalty } : null,
    },
    {
      key: 'evidenceCollection', label: 'Automatic evidence collection',
      score: clamp((commerce ? 35 : 0) + (helpdesk ? 25 : 0) + (tracking ? 25 : 0) + (warehouse ? 15 : 0) - exceptionPenalty),
      explanation: !commerce ? 'Order evidence is not available yet.' : !tracking ? 'Order and support evidence are available; shipment evidence is still missing.' : !warehouse ? 'Core evidence is available; warehouse evidence is still limited.' : 'Order, support, shipment, and warehouse evidence are available.',
      action: !commerce ? repairAction(input.commerce, 'Shopify', '/settings/integrations/shopify', 35) : !helpdesk ? repairAction(input.helpdesk, 'your helpdesk', '/integrations#connections', 25) : !tracking ? repairAction(input.tracking, 'shipment tracking', '/integrations#connections', 25) : !warehouse ? repairAction(input.warehouse, 'your warehouse', '/integrations#connections', 15) : null,
    },
    {
      key: 'financialReconciliation', label: 'Automatic financial reconciliation',
      score: clamp((commerce ? 45 : 0) + (payments ? 45 : 0) + (input.activeRules > 0 ? 10 : 0) - financialPenalty),
      explanation: !commerce ? 'Refund and order outcomes are unavailable.' : !payments ? 'Refunds can sync, but payment and dispute outcomes are unavailable.' : 'Refund and payment outcomes can be reconciled automatically.',
      action: !commerce ? repairAction(input.commerce, 'Shopify', '/settings/integrations/shopify', 45) : !payments ? repairAction(input.payments, 'your payment provider', '/integrations#connections', 45) : input.financialExceptions > 0 ? { label: 'Review financial exceptions', href: '/exceptions', impact: financialPenalty } : null,
    },
    {
      key: 'recoveryAutomation', label: 'Recovery automation',
      score: clamp((commerce ? 25 : 0) + (tracking ? 25 : 0) + (warehouse ? 35 : 0) + (input.activeRules > 0 ? 15 : 0) - recoveryPenalty),
      explanation: !warehouse ? 'Recovery work cannot be fully tracked without a warehouse or 3PL source.' : !tracking ? 'Warehouse data is ready, but shipment events are unavailable.' : input.activeRules < 1 ? 'Recovery sources are ready; routing rules still need configuration.' : 'Recovery work can be identified, routed, and tracked.',
      action: !warehouse ? repairAction(input.warehouse, 'or confirm your warehouse', '/integrations#connections', 35) : !tracking ? repairAction(input.tracking, 'shipment tracking', '/integrations#connections', 25) : input.activeRules < 1 ? { label: 'Configure recovery routing', href: '/rules', impact: 15 } : null,
    },
  ];

  const score = clamp(categories.reduce((sum, category) => sum + category.score * READINESS_WEIGHTS[category.key], 0));
  const unhealthySources = [input.commerce, input.helpdesk, input.tracking, input.payments, input.warehouse].filter((source) => source.connected && !healthy(source)).length;
  const connectedSources = [input.commerce, input.helpdesk, input.tracking, input.payments, input.warehouse].filter((source) => live(source)).length;
  const dataQuality = connectedSources < 2 ? 'Incomplete' : unhealthySources > 1 || input.unresolvedExceptions > 10 ? 'Needs attention' : unhealthySources === 1 || input.unresolvedExceptions > 0 ? 'Mostly healthy' : 'Healthy';
  const minutes = input.unresolvedExceptions * 2 + input.financialExceptions * 3 + input.recoveryTasks * 2;
  const workload = input.activityCount < 1 ? 'Not enough activity yet to estimate' : minutes < 5 ? 'Under 5 minutes/day' : minutes < 23 ? 'Around 15 minutes/day' : minutes < 46 ? 'Around 30 minutes/day' : 'More than 1 hour/day';
  const recommendation = categories.flatMap((category) => category.action ? [{ ...category.action, impact: category.action.impact * READINESS_WEIGHTS[category.key] }] : []).sort((a, b) => b.impact - a.impact)[0] ?? null;
  const readyAreas = categories.filter((category) => category.score >= 75).length;
  return { score, band: score >= 90 ? 'Ready' : score >= 75 ? 'Nearly ready' : score >= 50 ? 'Needs setup' : 'Limited automation', categories, dataQuality, workload, recommendation, earlyStage: input.activityCount < 1 && connectedSources < 2, readyAreas };
}
