import {
  annualDiscountPercent,
  annualFreeMonths,
  annualMonthlyEquivalentMinor,
  annualSavingGbp,
  BILLABLE_EVENTS,
  PLANS,
  PUBLIC_PLAN_IDS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
} from '@/lib/billing/plans';
import { formatMoney } from '@/lib/utils/format';

function currentPlanSummary(planId: (typeof PUBLIC_PLAN_IDS)[number]) {
  const plan = PLANS[planId];
  const planMoney = (pounds: number) => {
    const formatted = formatMoney(pounds * 100, plan.currency);
    return Number.isInteger(pounds) ? formatted.replace(/\.00$/, '') : formatted;
  };
  const monthly = plan.priceGbp === 'custom'
    ? 'custom monthly pricing'
    : `${planMoney(plan.priceGbp)}/month`;
  const saving = annualSavingGbp(plan);
  const effectiveMonthlyMinor = annualMonthlyEquivalentMinor(plan);
  const annual = typeof plan.annualPriceGbp === 'number'
    ? `${planMoney(plan.annualPriceGbp)} paid annually (${effectiveMonthlyMinor == null ? 'custom' : formatMoney(effectiveMonthlyMinor, plan.currency)}/month effective${saving == null ? '' : `, saving ${planMoney(saving)}`})`
    : 'custom annual terms';
  const incidents = typeof plan.limits.incidentsPerMonth === 'number'
    ? `${plan.limits.incidentsPerMonth} new incidents/month`
    : 'agreed incident volume';
  const stores = typeof plan.limits.connectedStores === 'number'
    ? `${plan.limits.connectedStores} connected store${plan.limits.connectedStores === 1 ? '' : 's'}`
    : 'agreed connected stores';
  return `${plan.name}: ${monthly}; ${annual}; ${incidents}; ${stores}. Complete core workflow included.`;
}

const annualDiscountSummary = [PLANS.core, PLANS.scale_2026].map((plan) => {
  const discount = annualDiscountPercent(plan);
  const freeMonths = annualFreeMonths(plan);
  return discount == null || freeMonths == null
    ? `${plan.name} annual terms are agreed.`
    : `${plan.name} annual price includes a ${discount}% discount, equivalent to ${freeMonths} months free.`;
}).join(' ');

export type HelpArticleSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  steps?: readonly string[];
};

export type HelpArticle = {
  slug: string;
  category: 'Activate' | 'Operate' | 'Recover' | 'Administer';
  title: string;
  summary: string;
  lead: string;
  appliesTo: string;
  keywords: readonly string[];
  sections: readonly HelpArticleSection[];
  related: readonly { label: string; href: string }[];
};

export const HELP_ARTICLES: readonly HelpArticle[] = [
  {
    slug: 'activation', category: 'Activate', title: 'Complete workspace activation', summary: 'Move from workspace access to verified sources and real import progress.', lead: 'Activation is complete only when the selected source stack is configured, verified, imported, and ready for operational evidence. A saved profile alone is not readiness.', appliesTo: 'Onboarding, source setup, and first import', keywords: ['onboarding', 'activate', 'setup', 'import', 'ready'],
    sections: [
      { id: 'plans', title: 'Plans and capacity', paragraphs: [...PUBLIC_PLAN_IDS.map(currentPlanSummary), `Prices are in GBP and exclude VAT. ${annualDiscountSummary} Enterprise terms are agreed. There is no Free plan.`] },
      { id: 'credits', title: 'Existing credit-based subscriptions', paragraphs: [...Object.values(BILLABLE_EVENTS).map(event => `${event.label}: ${event.credits} credits. ${event.chargingRule}`), `These credit charges and the ${TOP_UP_CREDITS}-credit £${TOP_UP_PRICE_GBP} top-up remain relevant to existing legacy subscription records. Current Core and Scale offers use the incident capacity shown above. No automatic overage or lifetime case credit is promised; payment changes require confirmation.`] },
      { id: 'sequence', title: 'Use the activation sequence', paragraphs: ['Work through the states in order so a configured credential is never mistaken for usable evidence.'], steps: ['Complete the workspace profile and applicability questions.', 'Connect the selected commerce and support sources.', 'Open Sources and confirm each required object family is verified, not merely configured.', 'Start the initial import and follow its real job progress.', 'Resolve failed rows or a stale connection before relying on Cases or financial totals.'] },
      { id: 'ready', title: 'Know what ready means', paragraphs: ['Workspace access, profile completion, configured sources, verified sources, import completion, evidence readiness, and operational readiness are separate states. The product keeps a later state unavailable when an earlier dependency is missing.'] },
      { id: 'blocked', title: 'If activation is blocked', paragraphs: ['Open the affected source rather than repeating onboarding. Preserve the provider error and failed object family when contacting support; do not send customer contact data or ticket bodies by email.'] },
    ], related: [{ label: 'Open onboarding', href: '/onboarding' }, { label: 'Open Sources', href: '/sources/connected' }, { label: 'Review imports', href: '/sources/imports' }],
  },
  {
    slug: 'source-repair', category: 'Activate', title: 'Repair a source connection', summary: 'Diagnose credentials, sync failures, stale families, and partial coverage.', lead: 'Connection status and evidence health are different axes. Repair the exact failing layer and verify a later successful read before treating the source as current.', appliesTo: 'Sources and import jobs', keywords: ['source', 'repair', 'stale', 'sync', 'credential', 'coverage'],
    sections: [
      { id: 'locate', title: 'Locate the failing layer', paragraphs: ['Open Sources and read configuration, credential verification, sync status, object-family coverage, and freshness separately. A green credential does not prove orders, tickets, shipments, or credits are current.'] },
      { id: 'repair', title: 'Repair and verify', paragraphs: ['Use the provider-specific reconnect or retry action shown on the source detail.'], steps: ['Record the error code and affected object family.', 'Repair credentials or provider permissions if verification failed.', 'Retry the failed import or sync job.', 'Wait for a successful completion and a newer data-through timestamp.', 'Reopen the dependent case or report and confirm its unavailable or stale state changes.'] },
      { id: 'escalate', title: 'Escalate without leaking data', paragraphs: ['Send support the workspace name, source, object family, job or connection reference, error code, and time. Do not email secrets, access tokens, customer addresses, or message bodies.'] },
    ], related: [{ label: 'Check source health', href: '/sources/connected' }, { label: 'Review import jobs', href: '/sources/imports' }, { label: 'Understand unavailable figures', href: '/help/data-health' }],
  },
  {
    slug: 'work-queue', category: 'Operate', title: 'Own and complete Work', summary: 'Find, claim, start, snooze, complete, and reopen operational work.', lead: 'Work is the server-backed queue for tasks and reconciliation exceptions. Filters, paging, ownership, deadlines, and state transitions remain part of the saved URL and audit trail.', appliesTo: 'Work queue', keywords: ['work', 'task', 'assign', 'snooze', 'complete', 'reopen'],
    sections: [
      { id: 'find', title: 'Find the right item', paragraphs: ['Use queue, state, owner, priority, search, and sort filters. Counts describe the full server result, not only the visible page. Follow Next until the target is visible.'] },
      { id: 'lifecycle', title: 'Use the task lifecycle', paragraphs: ['Claim or assign the item before acting when ownership is required. Start records active work; snooze requires a real until-time; complete requires the outcome; reopen restores work without erasing its earlier completion.'] },
      { id: 'exception', title: 'Treat exceptions as evidence gaps', paragraphs: ['A reconciliation exception is not a merchant decision. Open its linked source or case, resolve the mismatch from evidence, then complete the Work item with the exact outcome.'] },
    ], related: [{ label: 'Open Work', href: '/work' }, { label: 'Open reconciliation', href: '/financials/reconciliation' }, { label: 'Open Cases', href: '/cases' }],
  },
  {
    slug: 'case-investigation', category: 'Operate', title: 'Investigate a Case', summary: 'Separate source facts, findings, recommendations, decisions, and missing evidence.', lead: 'A Case is an evidence file. Read source freshness and the evidence tab before deciding; a recommendation remains advice until an authorised merchant records a decision.', appliesTo: 'Cases and investigations', keywords: ['case', 'investigation', 'evidence', 'recommendation', 'decision'],
    sections: [
      { id: 'read', title: 'Read the file in order', paragraphs: ['Confirm the case identity and back path, then inspect evidence, investigation activity, decision context, and recovery or financial history. Missing or conflicting evidence must remain visible.'] },
      { id: 'investigate', title: 'Request missing evidence', paragraphs: ['Create an investigation only for a named evidence gap. Select the real target and channel, review the request snapshot, then send only when the UI presents an authorised dispatcher. A sent request is immutable; later responses are appended.'] },
      { id: 'decide', title: 'Record merchant authority', paragraphs: ['State the decision, amount and currency where applicable, reason, and whether the recommendation was followed. Recording authorisation does not issue a refund, deny a claim, or change a provider system.'] },
    ], related: [{ label: 'Open Cases', href: '/cases' }, { label: 'Open evidence-gap queue', href: '/cases?queue=needs_evidence' }, { label: 'Use an external handoff', href: '/help/external-handoff' }],
  },
  {
    slug: 'external-handoff', category: 'Operate', title: 'Record an external handoff', summary: 'Move an authorised action to a provider without pretending Unauth performed it.', lead: 'Where no controlled write connector exists, Unauth prepares an exact handoff. The merchant performs the provider action and records a receipt; a later source observation remains independent.', appliesTo: 'Case action rail and Work', keywords: ['handoff', 'external', 'provider', 'receipt', 'attempt'],
    sections: [
      { id: 'prepare', title: 'Prepare the handoff', paragraphs: ['Open the Case action, confirm the authorised operation and payload, and copy or open the provider destination shown. A handoff-ready state means the action is prepared, not sent.'] },
      { id: 'record', title: 'Record what happened', paragraphs: ['After acting in the provider, record the attempt time, method, external reference, amount and currency if relevant, and receipt evidence. Use failed or indeterminate when the provider outcome is not known.'] },
      { id: 'observe', title: 'Wait for independent evidence', paragraphs: ['Provider acceptance, provider processing, successful execution, and a later source-observed result are distinct. Do not mark a case paid or a recovery received from a handoff receipt alone.'] },
    ], related: [{ label: 'Open Work', href: '/work' }, { label: 'Open Cases', href: '/cases' }, { label: 'Track recovery submission', href: '/help/recovery-submission' }],
  },
  {
    slug: 'recovery-submission', category: 'Recover', title: 'Submit and track a recovery', summary: 'Build a claim pack, record the real submission receipt, and track provider position.', lead: 'Unauth prepares the recovery record and evidence pack. Unless a proven dispatcher is shown, a person submits through the provider and records the exact external receipt.', appliesTo: 'Recovery board and recovery detail', keywords: ['recovery', 'claim', 'submission', 'pack', 'provider', 'deadline'],
    sections: [
      { id: 'pack', title: 'Complete the pack', paragraphs: ['Open the recovery, review the applicable approved agreement version, evidence requirements, deadlines, amount sought, currency, and missing evidence. Finalise only when the pack states ready.'] },
      { id: 'submit', title: 'Record the submission', paragraphs: ['Submit using the named provider channel, then record the external claim reference, URL or correspondence receipt, submitted time, submitter, amount and currency. This appends a submission record; it does not backdate or infer one.'] },
      { id: 'response', title: 'Record provider position without inventing money', paragraphs: ['Record acknowledgement, approval, partial approval, rejection, or other provider response with its evidence. Approval changes provider position only. Received recovery requires a separate observed credit and match.'] },
    ], related: [{ label: 'Open recovery board', href: '/financials/recovery' }, { label: 'Open Work', href: '/work' }, { label: 'Reconcile a credit', href: '/help/credit-reconciliation' }],
  },
  {
    slug: 'credit-reconciliation', category: 'Recover', title: 'Approved, received, matched, reconciled', summary: 'Keep approval, received credit, matching, and reconciliation separate.', lead: 'These four words describe four different amounts of money, and treating any two of them as the same is the fastest way to report a number you cannot defend. This is the article to read before your first month end.', appliesTo: 'Recovery board, reconciliation, reports and period close', keywords: ['credit', 'reconciliation', 'money', 'match', 'received', 'approval'],
    sections: [
      { id: 'approved', title: 'Approved', paragraphs: ['A carrier, a 3PL or a card network has said it will pay. That is all. It is a sentence in an email or a status in a portal, and Unauth records it as a status event with whoever observed it. It is not money, it has no date on your bank statement, and about one approval in fourteen never turns into a payment at all.'] },
      { id: 'received', title: 'Received', paragraphs: ['A payment has appeared in a settlement file. It has an amount, a date and a reference. Received is the first of the four that is real money, and it is the earliest point at which Unauth will let a figure count towards recovery.'] },
      { id: 'matched', title: 'Matched', paragraphs: ['The received payment has been tied to the claim it pays. Carriers pay in batches, net of adjustments, often weeks late and rarely with the reference you filed under. A payment sitting unmatched is money you have that you cannot yet attribute — which is why the reconciliation workspace exists and why it is usually the busiest surface at month end.'] },
      { id: 'reconciled', title: 'Reconciled', paragraphs: ['The match has been accepted, the loss entry has been closed against it, and the difference between what was sought and what arrived has been explained. Only reconciled money is safe to report to finance without a footnote.'] },
      { id: 'why', title: 'Why the product is stubborn about this', paragraphs: ['It would be easy to show one recovery number, and every dashboard you have used probably does. The problem appears three months later, when someone asks why the recovery figure fell. The honest answer is that it never rose — an approval was counted as a receipt, and the receipt never came.'] },
    ], related: [{ label: 'Recovery board', href: '/financials/recovery' }, { label: 'Reconciliation', href: '/financials/reconciliation' }, { label: 'Reports', href: '/financials/reports' }, { label: 'Period close', href: '/financials/reconciliation?action=close' }],
  },
  {
    slug: 'roles-permissions', category: 'Administer', title: 'Manage roles and workspace access', summary: 'Invite exact roles, transfer ownership, change access, and remove members safely.', lead: 'Displayed roles and server enforcement use the same four-role model: Owner, Administrator, Analyst, and Viewer. Only the owner can transfer ownership or delete the workspace.', appliesTo: 'People and roles', keywords: ['role', 'owner', 'administrator', 'analyst', 'viewer', 'invite', 'transfer'],
    sections: [
      { id: 'choose', title: 'Choose the least-privilege role', paragraphs: ['Viewer reads core operational surfaces. Analyst also performs case and Work actions. Administrator manages settings and lower roles. Owner alone grants ownership-level authority, transfers ownership, and deletes the workspace.'] },
      { id: 'change', title: 'Invite or change access', paragraphs: ['Invite with the exact intended role. An Administrator cannot invite, promote, demote, or remove another Administrator or the Owner. No user can change or remove their own membership from the role editor.'] },
      { id: 'transfer', title: 'Transfer ownership deliberately', paragraphs: ['The current owner selects an active member, reviews the consequence, and types the transfer confirmation. The database changes both roles atomically so the workspace never has an ambiguous owner.'] },
    ], related: [{ label: 'Open People and roles', href: '/settings/workspace/team' }, { label: 'Open audit trail', href: '/settings/governance/audit-trail' }, { label: 'Open data privacy', href: '/settings/legal/data-privacy' }],
  },
  {
    slug: 'privacy-requests', category: 'Administer', title: 'Handle subject access, erasure, and workspace deletion', summary: 'Use the scoped export, erasure receipt, and resumable owner-only deletion job.', lead: 'Subject access and existing erasure receipts use a canonical customer ID and remain merchant-scoped. Customer erasure is blocked while a verified preview is unavailable. Workspace deletion is a separate owner-only job and does not delete the owner’s authentication identity.', appliesTo: 'Data privacy', keywords: ['privacy', 'access', 'erasure', 'delete', 'receipt', 'export'],
    sections: [
      { id: 'access', title: 'Download subject access JSON', paragraphs: ['Enter the canonical customer ID shown in Customers and download the versioned JSON contract. It includes linked customer, order, ticket, case, loss, and recovery records; it is not a workspace-wide export. The response is not retained as a server-side export file.'] },
      { id: 'erase', title: 'Review an existing erasure receipt', paragraphs: ['Erasure preview is unavailable. Customer erasure cannot be confirmed here until a verified scope can be reviewed. Use Check status with the canonical customer ID to inspect an existing receipt and its storage-cleanup state. Queued cleanup and unavailable backup-cycle status must not be treated as completion.'] },
      { id: 'workspace', title: 'Delete a workspace', paragraphs: ['Only the owner can start the job. Export the chosen audit or supporting records first, transfer ownership instead if the workspace should continue, then type the workspace-specific phrase. A paused storage, database, or verification stage can resume by job ID without repeating completed stages. Completion creates an immutable receipt and retains the user sign-in identity.'] },
    ], related: [{ label: 'Open data privacy', href: '/settings/legal/data-privacy' }, { label: 'Export audit trail', href: '/settings/governance/audit-trail' }, { label: 'Manage ownership', href: '/settings/workspace/team' }],
  },
  {
    slug: 'api-access', category: 'Administer', title: 'Use scoped machine API access', summary: 'Create an entitled key, choose scopes and rate, and handle server denials.', lead: `Machine API access requires an entitled active or grace-period ${PLANS.scale.name} subscription (legacy internal ID: scale). The server checks entitlement, explicit key scope, revocation, merchant scope, and per-key rate on every request.`, appliesTo: 'API access and /api/v1', keywords: ['api', 'key', 'scope', 'rate limit', '401', '403', '429'],
    sections: [
      { id: 'create', title: 'Create a least-privilege key', paragraphs: ['Open API access, name the integration, select only the required scopes, and choose 15, 30, 60, or 120 requests per minute. Copy the secret once; only its prefix and hash remain available afterwards.'] },
      { id: 'authenticate', title: 'Authenticate and choose a scope', paragraphs: ['Send the key as Authorization: Bearer <key>. Read families require customers:read, cases:read, evidence:read, imports:read, or lookup:read. Write families require cases:write, evidence:write, or imports:write. Empty-scope historical keys have no machine access.'] },
      { id: 'routes', title: 'Use the retained endpoints', paragraphs: ['/api/v1/customers and lookup/profile-link expose permitted reads; /api/v1/evidence creates or downloads evidence; /api/v1/ingest/customers, orders, cases, and events accept scoped imports; gate, escalation, and helpdesk context routes use their declared case or lookup scope. Exact request fields remain defined by each endpoint response and validation error.'] },
      { id: 'errors', title: 'Handle denial and rate responses', paragraphs: ['401 means the key is missing or invalid. 403 means subscription entitlement or scope is absent. 429 means the selected per-minute rate was exceeded. The limiter fails closed if its durable counter is unavailable. Revoke a key immediately when its secret may be exposed.'] },
    ], related: [{ label: 'Open API access', href: '/settings/developers/api-access' }, { label: 'Review billing entitlement', href: '/settings/billing' }, { label: 'Open audit trail', href: '/settings/governance/audit-trail' }],
  },
  {
    slug: 'data-health', category: 'Operate', title: 'Understand unavailable, partial, stale, and zero', summary: 'Read money and evidence state without turning missing data into zero.', lead: 'Unavailable means Unauth could not compute a truthful value from the required records. Zero means the required records were present and the result was nothing.', appliesTo: 'Overview, reports, loss, recovery, and reconciliation', keywords: ['unavailable', 'zero', 'partial', 'stale', 'coverage', 'currency'],
    sections: [
      { id: 'states', title: 'Read the state first', paragraphs: ['Verified zero, no records, missing, partial, stale, and unreconciled are different states. Partial values state their included scope. Stale values state their as-of time. Mixed currencies stay separated.'] },
      { id: 'source', title: 'Find the responsible source', paragraphs: ['Use the coverage or source-health link beside the value, identify the missing object family, then inspect its last successful sync and failed rows. If the cause is a mismatch rather than a source, open Reconciliation.'] },
      { id: 'next', title: 'Repair or report the bounded value', paragraphs: ['Repair the source and verify a later successful read, or report only the known scope with its exclusions. Never replace an unavailable value with zero in an external spreadsheet.'] },
    ], related: [{ label: 'Open reports', href: '/financials/reports' }, { label: 'Check Sources', href: '/sources/connected' }, { label: 'Open reconciliation', href: '/financials/reconciliation' }],
  },
] as const;

export function getHelpArticle(slug: string) {
  return HELP_ARTICLES.find((article) => article.slug === slug) ?? null;
}
