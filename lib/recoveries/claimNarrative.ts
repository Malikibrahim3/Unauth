import type { CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

/** Recorded evidence retains its attribution; absence never becomes an event. */
export function claimNarrative(file: CaseEvidenceFile): string {
  const lines = [`Reported issue: ${file.claim.issueSummary || 'Issue summary unavailable.'}`];
  const allowed = new Set(file.evidence.filter((item) => item.allowedInProviderPack && item.factKind === 'source_fact').map((item) => item.id));
  for (const event of file.custodyChain) {
    const evidence = event.evidenceIds.filter((id) => allowed.has(id));
    if (event.state !== 'met' || !evidence.length) continue;
    lines.push(`${event.label} — ${event.occurredAt && Number.isFinite(Date.parse(event.occurredAt)) ? event.occurredAt : 'Event date unavailable'}: ${event.summary} [${evidence.join(', ')}]`);
  }
  const recovery = file.recoveryCase;
  lines.push(recovery && Number.isSafeInteger(recovery.amount_sought_minor) && recovery.currency
    ? `Requested recovery: ${formatMinorCurrencyNullable(recovery.amount_sought_minor, recovery.currency)}. This is not a provider approval or received credit.`
    : 'Requested recovery amount unavailable.');
  const missing = file.providerClaimReadiness.gates.filter((gate) => !['met', 'not_applicable'].includes(gate.state));
  if (missing.length) lines.push(`Incomplete draft. Missing inputs: ${missing.map((gate) => `${gate.headline}: ${gate.nextAction}`).join(' ')}`);
  return lines.join('\n\n');
}
