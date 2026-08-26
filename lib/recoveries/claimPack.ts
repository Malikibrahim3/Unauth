import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import React from 'react';
import type { Style } from '@react-pdf/types';
import type { ClaimGate, ClaimPosture, ClaimReadinessState, ProviderClaimReadiness } from './claimReadiness';
import { isAllowedInProviderPack, type CaseSourceClass } from '@/lib/evidence/sourceClasses';

export type ClaimPackSource = {
  id: string;
  sourceClass: CaseSourceClass | null;
  system: string;
  sourceRecordId: string | null;
  originalUrl: string | null;
  storagePath: string | null;
  eventAt: string | null;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
  ingestedAt: string | null;
  freshness: string;
  factKind: 'source_fact' | 'human_finding' | 'inference';
  evidenceType: string;
  summary: string;
  contentHash: string | null;
  lineageRootId: string;
  supports: string[];
  conflicts: string[];
  originalContent?: Uint8Array | Buffer | null;
};

export type ClaimPackInput = {
  recoveryCaseId: string;
  supportPayoutCaseId: string;
  partnerName: string;
  providerType: string;
  currency: string | null;
  amountSoughtMinor: number | null;
  readiness: ProviderClaimReadiness;
  ruleVersionId: string | null;
  issueSummary: string;
  chronology: Array<{ stage: string; occurredAt: string | null; summary: string; evidenceIds: string[] }>;
  sources: ClaimPackSource[];
  generatedAt?: string;
  forceDraft?: boolean;
};

export type ClaimPackManifest = {
  manifestVersion: 'claim-pack-v1';
  generatedAt: string;
  recoveryCaseId: string;
  supportPayoutCaseId: string;
  provider: { name: string; type: string };
  ruleVersionId: string | null;
  readiness: ClaimReadinessState;
  posture: ClaimPosture;
  draftWatermark: boolean;
  issueSummary: string;
  claimAmount: { minor: number | null; currency: string | null };
  gates: ClaimGate[];
  chronology: ClaimPackInput['chronology'];
  allowedSources: Array<Omit<ClaimPackSource, 'originalContent'>>;
  excludedSources: Array<{ id: string; sourceClass: CaseSourceClass | null; reason: string }>;
  checklist: string[];
};

export type ClaimPackBuild = {
  state: 'draft' | 'final';
  manifest: ClaimPackManifest;
  allowedSources: ClaimPackSource[];
  excludedSources: ClaimPackManifest['excludedSources'];
  manifestJson: string;
  manifestHash: string;
  nextAction: string;
};

function packSource(source: ClaimPackSource): Omit<ClaimPackSource, 'originalContent'> {
  const { originalContent: _originalContent, ...safe } = source;
  return safe;
}

function gateChecklist(gates: ClaimGate[]): string[] {
  return gates.map((gate) => `${gate.id}: ${gate.state} — ${gate.state === 'met' || gate.state === 'not_applicable' ? 'satisfied' : gate.nextAction}`);
}

/**
 * Build a deterministic, provider-safe manifest. Customer history and any
 * unclassified source are excluded rather than silently promoted into proof.
 */
export function buildClaimPack(input: ClaimPackInput): ClaimPackBuild {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const allowedSources: ClaimPackSource[] = [];
  const excludedSources: ClaimPackManifest['excludedSources'] = [];
  for (const source of [...input.sources].sort((left, right) => left.id.localeCompare(right.id))) {
    if (!isAllowedInProviderPack(source.sourceClass)) {
      excludedSources.push({
        id: source.id,
        sourceClass: source.sourceClass,
        reason: source.sourceClass === 'customer_history'
          ? 'Customer history is review context only and is not provider evidence.'
          : 'The source class is not permitted in an external provider pack.',
      });
      continue;
    }
    allowedSources.push(source);
  }
  const state: ClaimPackBuild['state'] = !input.forceDraft && input.readiness.readiness === 'ready_to_submit' ? 'final' : 'draft';
  const manifest: ClaimPackManifest = {
    manifestVersion: 'claim-pack-v1',
    generatedAt,
    recoveryCaseId: input.recoveryCaseId,
    supportPayoutCaseId: input.supportPayoutCaseId,
    provider: { name: input.partnerName, type: input.providerType },
    ruleVersionId: input.ruleVersionId,
    readiness: input.readiness.readiness,
    posture: input.readiness.posture,
    draftWatermark: state === 'draft',
    issueSummary: input.issueSummary,
    claimAmount: { minor: input.amountSoughtMinor, currency: input.currency?.toUpperCase() ?? null },
    gates: input.readiness.gates,
    chronology: [...input.chronology].sort((left, right) => (left.occurredAt ?? '').localeCompare(right.occurredAt ?? '')),
    allowedSources: allowedSources.map(packSource),
    excludedSources,
    checklist: gateChecklist(input.readiness.gates),
  };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestHash = createHash('sha256').update(manifestJson, 'utf8').digest('hex');
  return {
    state,
    manifest,
    allowedSources,
    excludedSources,
    manifestJson,
    manifestHash,
    nextAction: state === 'final'
      ? 'The pack is frozen for manual merchant submission.'
      : input.readiness.nextAction,
  };
}

function escapeText(value: string): string {
  return value.replace(/[<>]/g, '');
}

/** Render a compact, deliberately factual PDF. No customer-history section is generated. */
export async function renderClaimPackPdf(build: ClaimPackBuild): Promise<Buffer> {
  const { renderToBuffer, Document, Page, Text, StyleSheet } = await import('@react-pdf/renderer');
  const styles = StyleSheet.create({
    page: { padding: 36, fontSize: 9, color: '#182027' },
    title: { fontSize: 18, marginBottom: 8 },
    watermark: { color: '#9a3b2f', fontSize: 10, marginBottom: 12 },
    heading: { fontSize: 12, marginTop: 12, marginBottom: 5 },
    row: { marginBottom: 4 },
    small: { color: '#4f5b66', marginBottom: 3 },
  });
  const { manifest } = build;
  const text = (style: Style, value: string, key?: string) => React.createElement(Text, { style, key }, value);
  const tree = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      text(styles.title, 'Provider claim pack'),
      manifest.draftWatermark ? text(styles.watermark, 'Draft — evidence incomplete') : null,
      text(styles.small, `Case ${manifest.recoveryCaseId} · Provider ${escapeText(manifest.provider.name)}`),
      text(styles.small, `Readiness ${manifest.readiness} · Posture ${manifest.posture}`),
      text(styles.small, manifest.issueSummary),
      text(styles.heading, 'Claim gates'),
      ...manifest.gates.map((gate) => text(styles.row, `${gate.id}: ${gate.state} — ${escapeText(gate.reason)}`, gate.id)),
      text(styles.heading, 'Chronology'),
      ...manifest.chronology.map((event, index) => text(styles.row, `${event.occurredAt ?? 'Date unavailable'} · ${escapeText(event.stage)} · ${escapeText(event.summary)}`, `${event.stage}-${index}`)),
      text(styles.heading, 'Included source records'),
      ...manifest.allowedSources.map((source) => text(styles.row, `${source.id} · ${source.sourceClass} · ${escapeText(source.summary)}`, source.id)),
    ),
  );
  return Buffer.from(await renderToBuffer(tree));
}

export async function renderClaimPackZip(build: ClaimPackBuild, pdf: Buffer): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('claim-pack.pdf', pdf);
  zip.file('manifest.json', build.manifestJson);
  zip.file('checklist.txt', `${build.manifest.checklist.join('\n')}\n`);
  for (const source of build.allowedSources) {
    if (source.originalContent) zip.file(`originals/${source.id}`, source.originalContent);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function hashClaimPackArtifact(value: Buffer | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}
