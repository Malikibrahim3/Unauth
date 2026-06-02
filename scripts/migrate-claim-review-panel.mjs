#!/usr/bin/env node
/**
 * Migrates ClaimReviewPanel to useClaimReviewWorkbench + extracted subcomponents.
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const panelPath = path.join(root, 'components/claims/ClaimReviewPanel.tsx');
const bodyPath = path.join(root, 'components/claims/ClaimReviewPanelBody.tsx');
const panelSrc = fs.readFileSync(panelPath, 'utf8');
const lines = panelSrc.split('\n');

// Extract two-column body (after sticky header) through end of outer wrapper
const bodyStart = lines.findIndex((l) => l.includes('Two-column case console'));
const bodyEnd = lines.findIndex((l, i) => i > bodyStart && l.trim() === '</div>{/* end two-column body */}');
if (bodyStart === -1 || bodyEnd === -1) {
  console.error('Could not find body boundaries', bodyStart, bodyEnd);
  process.exit(1);
}

let body = lines.slice(bodyStart, bodyEnd + 1).join('\n');

const replacements = [
  [/\bselectedClaim\b/g, 'wb.selectedClaim'],
  [/\bselectedClaimEvents\b/g, 'wb.selectedClaimEvents'],
  [/\blatestOutcome\b/g, 'wb.latestOutcome'],
  [/\bpreviousOutcome\b/g, 'wb.previousOutcome'],
  [/\bcustomerResponse\b/g, 'wb.customerResponse'],
  [/\bresponseRecorded\b/g, 'wb.responseRecorded'],
  [/\bevidenceRecorded\b/g, 'wb.evidenceRecorded'],
  [/\bclaimIsClosed\b/g, 'wb.claimIsClosed'],
  [/\bprimaryAction\b/g, 'wb.primaryAction'],
  [/\bnextClaimAction\b/g, 'wb.nextClaimAction'],
  [/\bidentityPoints\b/g, 'wb.identityPoints'],
  [/\bwithinStoreSignals\b/g, 'wb.withinStoreSignals'],
  [/\bcrossMerchantCount\b/g, 'wb.crossMerchantCount'],
  [/\bcustomerName\b/g, 'wb.customerName'],
  [/\bconfidenceLabel\b/g, 'wb.confidenceLabel'],
  [/\bactiveDuplicateClaim\b/g, 'wb.activeDuplicateClaim'],
  [/\bresolvedDuplicateClaim\b/g, 'wb.resolvedDuplicateClaim'],
  [/\bmanualMode\b/g, 'wb.manualMode'],
  [/\borderOptions\b/g, 'wb.orderOptions'],
  [/\bselectedOrder\b/g, 'wb.selectedOrder'],
  [/\border\b/g, 'wb.order'],
  [/\bdata\b/g, 'wb.data'],
  [/\bhistory\b/g, 'wb.history'],
  [/\bshops\b/g, 'wb.shops'],
  [/\bshopDomain\b/g, 'wb.shopDomain'],
  [/\bsupportCases\b/g, 'wb.supportCases'],
  [/\bfraudFlags\b/g, 'wb.fraudFlags'],
  [/\bclaimFormOpen\b/g, 'wb.claimFormOpen'],
  [/\bresolvedActiveClaimId\b/g, 'wb.resolvedActiveClaimId'],
  [/\bselectedOrderId\b/g, 'wb.effectiveSelectedOrderId'],
  [/\bclaimId\b/g, 'wb.claimId'],
  [/\bbusy\b/g, 'wb.busy'],
  [/\bclaimType\b/g, 'wb.state.claimType'],
  [/\bcustomerReason\b/g, 'wb.state.customerReason'],
  [/\bnotes\b/g, 'wb.state.notes'],
  [/\bdecision\b/g, 'wb.state.decision'],
  [/\boutcome\b/g, 'wb.state.outcome'],
  [/\bevidenceType\b/g, 'wb.state.evidenceType'],
  [/\bsource\b/g, 'wb.state.source'],
  [/\bevidenceUrl\b/g, 'wb.state.evidenceUrl'],
  [/\bevidenceHash\b/g, 'wb.state.evidenceHash'],
  [/\bmetaRows\b/g, 'wb.state.metaRows'],
  [/\bshowMeta\b/g, 'wb.state.showMeta'],
  [/\bstatusToSet\b/g, 'wb.state.statusToSet'],
  [/\bstatusNote\b/g, 'wb.state.statusNote'],
  [/\breopenNote\b/g, 'wb.state.reopenNote'],
  [/\breverseDecision\b/g, 'wb.state.reverseDecision'],
  [/\breverseOutcome\b/g, 'wb.state.reverseOutcome'],
  [/\breverseNote\b/g, 'wb.state.reverseNote'],
  [/\bsnoozeDays\b/g, 'wb.state.snoozeDays'],
  [/\bsnoozeReason\b/g, 'wb.state.snoozeReason'],
  [/\bmanualOrderRef\b/g, 'wb.state.manualOrderRef'],
  [/\bmanualOrderSource\b/g, 'wb.state.manualOrderSource'],
  [/\bmanualModeExplicit\b/g, 'wb.state.manualModeExplicit'],
  [/\borderValue\b/g, 'wb.state.orderValue'],
  [/\bauditTab\b/g, 'wb.state.auditTab'],
  [/\brailOpen\b/g, 'wb.state.railOpen'],
  [/\bonClaim\b/g, 'wb.onClaim'],
  [/\bonOutcome\b/g, 'wb.onOutcome'],
  [/\bonEvidence\b/g, 'wb.onEvidence'],
  [/\bonStatusChange\b/g, 'wb.onStatusChange'],
  [/\bonReopen\b/g, 'wb.onReopen'],
  [/\bonReverse\b/g, 'wb.onReverse'],
  [/\bonCopyCustomerResponse\b/g, 'wb.onCopyCustomerResponse'],
  [/\bonAssignment\b/g, 'wb.onAssignment'],
  [/\bonSnooze\b/g, 'wb.onSnooze'],
  [/\bonClearSnooze\b/g, 'wb.onClearSnooze'],
  [/\bhandlePrimaryCta\b/g, 'wb.handlePrimaryCta'],
  [/\bsetClaimId\(/g, 'wb.setClaimId('],
  [/\bsetSelectedOrderId\(([^)]+)\)/g, 'wb.patch({ selectedOrderId: $1 })'],
  [/\bsetClaimType\(([^)]+)\)/g, 'wb.patch({ claimType: $1 })'],
  [/\bsetCustomerReason\(([^)]+)\)/g, 'wb.patch({ customerReason: $1 })'],
  [/\bsetNotes\(([^)]+)\)/g, 'wb.patch({ notes: $1 })'],
  [/\bsetDecision\(([^)]+)\)/g, 'wb.patch({ decision: $1 })'],
  [/\bsetOutcome\(([^)]+)\)/g, 'wb.patch({ outcome: $1 })'],
  [/\bsetEvidenceType\(([^)]+)\)/g, 'wb.patch({ evidenceType: $1 })'],
  [/\bsetSource\(([^)]+)\)/g, 'wb.patch({ source: $1 })'],
  [/\bsetEvidenceUrl\(([^)]+)\)/g, 'wb.patch({ evidenceUrl: $1 })'],
  [/\bsetEvidenceHash\(([^)]+)\)/g, 'wb.patch({ evidenceHash: $1 })'],
  [/\bsetShowMeta\(([^)]+)\)/g, 'wb.patch({ showMeta: $1 })'],
  [/\bsetStatusToSet\(([^)]+)\)/g, 'wb.patch({ statusToSet: $1 })'],
  [/\bsetStatusNote\(([^)]+)\)/g, 'wb.patch({ statusNote: $1 })'],
  [/\bsetReopenNote\(([^)]+)\)/g, 'wb.patch({ reopenNote: $1 })'],
  [/\bsetReverseDecision\(([^)]+)\)/g, 'wb.patch({ reverseDecision: $1 })'],
  [/\bsetReverseOutcome\(([^)]+)\)/g, 'wb.patch({ reverseOutcome: $1 })'],
  [/\bsetReverseNote\(([^)]+)\)/g, 'wb.patch({ reverseNote: $1 })'],
  [/\bsetSnoozeDays\(([^)]+)\)/g, 'wb.patch({ snoozeDays: $1 })'],
  [/\bsetSnoozeReason\(([^)]+)\)/g, 'wb.patch({ snoozeReason: $1 })'],
  [/\bsetManualOrderRef\(([^)]+)\)/g, 'wb.patch({ manualOrderRef: $1 })'],
  [/\bsetManualOrderSource\(([^)]+)\)/g, 'wb.patch({ manualOrderSource: $1 })'],
  [/\bsetManualModeExplicit\(([^)]+)\)/g, 'wb.patch({ manualModeExplicit: $1 })'],
  [/\bsetOrderValue\(([^)]+)\)/g, 'wb.patch({ orderValue: $1 })'],
  [/\bsetClaimFormOpen\(([^)]+)\)/g, 'wb.patch({ claimFormOpen: $1 })'],
  [/\bsetAuditTab\(([^)]+)\)/g, 'wb.patch({ auditTab: $1 })'],
  [/\bsetShopDomain\(([^)]+)\)/g, 'void $1 /* shopDomain is read-only from API */'],
  [/\bsetRailOpen\(([^)]+)\)/g, 'wb.dispatch({ type: "setRailOpen", railOpen: $1 })'],
  [/\bonToggle=\{\(id\) => setRailOpen\(\(p\) => \(\{ \.\.\.p, \[id\]: !p\[id\] \}\)\)\}/g, 'onToggle={(id) => wb.dispatch({ type: "toggleRail", id })'],
  [/\bformatMoney\b/g, 'formatClaimMoney'],
  [/\bformatOrderOption\b/g, 'formatOrderOption'],
];

for (const [re, repl] of replacements) {
  body = body.replace(re, repl);
}

const bodyFile = `'use client';

import Link from 'next/link';
import { signalLabel } from '@/lib/copy/signalLabels';
import { formatRiskScore } from '@/lib/utils/format';
import { claimEventLabel, claimEventSummary } from '@/lib/claims/events';
import { formatClaimAge, formatFiledDate } from '@/lib/claims/sla';
import SupportCaseContextList from '@/components/support/SupportCaseContextList';
import { ClaimReviewHistoryTable } from '@/components/claims/ClaimReviewHistoryTable';
import {
  CLAIM_TYPE_LABELS,
  DECISION_LABELS,
  EVIDENCE_SOURCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  OUTCOME_LABELS,
  STATUS_LABELS,
} from '@/components/claims/claimReviewLabels';
import { formatOrderOption } from '@/components/claims/claimReviewLogic';
import { formatClaimMoney, btnStyle, inputStyle } from '@/components/claims/claimReviewStyles';
import {
  CaseIntelTile,
  ClaimLifecycleStatusBar,
  FieldLabel,
  RailSection,
  StatusPill,
  SlaBadge,
} from '@/components/claims/claimReviewPrimitives';
import type { ClaimReviewWorkbench } from '@/components/claims/claimReviewWorkbench';
import type { ClaimType, Decision, EvidenceSource, EvidenceType, Outcome } from '@/components/claims/claimReviewTypes';

export function ClaimReviewPanelBody({ wb }: { wb: ClaimReviewWorkbench }) {
  return (
    <>
${body.split('\n').map((l) => '      ' + l).join('\n')}
    </>
  );
}
`;

fs.writeFileSync(bodyPath, bodyFile);

const newPanel = `'use client';

import { ClaimReviewHeader } from '@/components/claims/ClaimReviewHeader';
import { ClaimReviewPanelBody } from '@/components/claims/ClaimReviewPanelBody';
import { ClaimReviewToast } from '@/components/claims/ClaimReviewToast';
import { useClaimReviewWorkbench } from '@/components/claims/claimReviewState';

export default function ClaimReviewPanel({
  profileId,
  initialClaimId,
}: {
  profileId: string;
  initialClaimId?: string | null;
}) {
  const wb = useClaimReviewWorkbench(profileId, initialClaimId);

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <ClaimReviewToast wb={wb} />
      <ClaimReviewHeader wb={wb} />
      <ClaimReviewPanelBody wb={wb} />
    </div>
  );
}
`;

fs.writeFileSync(panelPath, newPanel);
console.log('Migrated ClaimReviewPanel -> hook + body');
