import Link from 'next/link';
import { PrintButton } from '@/components/help/HelpCentre';
import { LegalHeader } from './LegalHeader';

type DocKey = 'privacy' | 'handling' | 'dpa' | 'pilot';
type LegalSection = { title: string; paragraphs: string[] };

const SURFACE_IDS: Record<DocKey, string> = {
  privacy: 'privacy-policy',
  handling: 'data-handling-explainer',
  dpa: 'data-processing-addendum',
  pilot: 'pilot-terms',
};

function sectionId(title: string) {
  return title.replace(/^\d+\.\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const SHARED_APPROVAL = 'This repository does not contain the named legal entity, controller contact, counsel approval, approved retention schedule, or verified subprocessor register required to make this document operative. It must not be used for a merchant invitation, procurement review, signature, or external release.';

const DOCUMENTS: Record<DocKey, { title: string; subtitle: string; sections: LegalSection[] }> = {
  privacy: {
    title: 'Privacy notice approval gate',
    subtitle: 'Unapproved draft · no effective date · not an operative privacy notice',
    sections: [
      { title: '1. Current status', paragraphs: [SHARED_APPROVAL] },
      { title: '2. Product controls already implemented', paragraphs: ['Authorised workspace operators can download a merchant-scoped subject access JSON file, run subject erasure with a durable receipt, and use one owner-only resumable workspace deletion job. The product does not publish an unapproved retention period as a legal fact.'] },
      { title: '3. Approval required', paragraphs: ['Before release, the owner and counsel must approve the controller and processor roles, lawful purposes, data categories, rights process, contact address, retention by data class, international-transfer position, cookie position, issue date, and version.'] },
    ],
  },
  handling: {
    title: 'Data handling approval gate',
    subtitle: 'Unapproved operational draft · not an approved contractual schedule',
    sections: [
      { title: '1. Current status', paragraphs: [SHARED_APPROVAL] },
      { title: '2. Implemented operational boundary', paragraphs: ['Connected records, cases, evidence, financial entries, and audit records are merchant-scoped. Source facts, merchant findings, recommendations, decisions, provider positions, received credits, and reconciliation states remain separate records. Workspace deletion verifies storage and database removal before it creates a durable receipt.'] },
      { title: '3. Approval required', paragraphs: ['Before external use, the owner and counsel must approve the processing purposes, retention exceptions, deletion obligations, subprocessor responsibilities, security schedule, and incident process against the deployed environment.'] },
    ],
  },
  dpa: {
    title: 'Data processing addendum approval gate',
    subtitle: 'No approved version · not offered for signature',
    sections: [
      { title: '1. Current status', paragraphs: [SHARED_APPROVAL] },
      { title: '2. No implied agreement', paragraphs: ['Using the product or printing this page does not accept a data processing addendum. No controller or processor identity, service location, breach-notification period, audit commitment, transfer mechanism, or deletion schedule is represented as approved here.'] },
      { title: '3. Approval required', paragraphs: ['A pilot cannot be invited until the named parties, subject matter, duration, instructions, security schedule, subject-rights assistance, audit terms, deletion or return terms, transfer position, and verified subprocessor register are approved and versioned.'] },
    ],
  },
  pilot: {
    title: 'Pilot terms approval gate',
    subtitle: 'No approved pilot agreement · not offered for acceptance',
    sections: [
      { title: '1. Current status', paragraphs: [SHARED_APPROVAL] },
      { title: '2. No implied commercial terms', paragraphs: ['This page does not promise a pilot duration, notice period, data-availability window, service level, credit allowance, plan entitlement, testimonial permission, or right to export every workspace record. Those terms require a named merchant, named contacts, and an approved agreement.'] },
      { title: '3. Admission gate', paragraphs: ['Before any real merchant is invited, the owner must name the merchant and contacts, approve the selected provider scope and commercial terms, and obtain counsel approval for the pilot agreement, privacy notice, data processing addendum, retention schedule, and subprocessor register.'] },
    ],
  },
};

const NAV: Array<[DocKey, string, string]> = [
  ['privacy', 'Privacy notice', '/legal/privacy'],
  ['handling', 'Data handling', '/legal/data-handling'],
  ['dpa', 'Data processing addendum', '/legal/dpa'],
  ['pilot', 'Pilot terms', '/legal/pilot-terms'],
];

export function PublicOperationsLegal({ doc }: { doc: DocKey }) {
  const current = DOCUMENTS[doc];
  return (
    <div data-screen-label={current.title} data-visual-world="supplied-package" data-surface-id={SURFACE_IDS[doc]} data-operations-surface="legal" data-document={doc} data-release-status="blocked-unapproved" style={{ minHeight: '100vh', background: '#fff', color: '#1c1f23' }}>
      <LegalHeader currentPath={`/legal/${doc === 'handling' ? 'data-handling' : doc === 'pilot' ? 'pilot-terms' : doc}`} />
      <main id="main-content" className="legal-authority-layout" tabIndex={-1} style={{ display: 'flex', justifyContent: 'center', gap: 44, padding: '44px 40px 56px' }}>
        <aside className="legal-authority-nav" style={{ width: 232, flex: '0 0 232px', paddingTop: 6 }}>
          <div style={{ paddingBottom: 10, color: '#6f6a63', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>LEGAL</div>
          <nav aria-label="Legal documents">{NAV.map(([key, label, href]) => <div key={key} style={{ padding: '9px 0', borderTop: '1px solid #ece9e4' }}><Link href={href} aria-current={key === doc ? 'page' : undefined} style={{ color: key === doc ? '#1c1f23' : '#64686d', font: `${key === doc ? 500 : 400} 12.5px/1.4 'Inter',sans-serif`, textDecoration: 'none' }}>{label}</Link></div>)}</nav>
          <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid #ece9e4', color: '#6f6a63', font: "400 10.5px/1.6 'IBM Plex Mono',monospace" }}>Approval pending · no effective version</div>
          <div style={{ marginTop: 14, color: '#64686d', font: "400 11.5px/1.6 'Inter',sans-serif" }}>Printable. These pages remain light and do not depend on client-side state.</div>
          <div style={{ marginTop: 14, padding: '16px 0 8px', borderTop: '1px solid #ece9e4', color: '#6f6a63', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>ON THIS PAGE</div>
          <nav aria-label="On this page">{current.sections.map((section) => <div key={section.title} style={{ padding: '6px 0' }}><a href={`#${sectionId(section.title)}`} style={{ color: '#64686d', font: "400 12px/1.45 'Inter',sans-serif", textDecoration: 'none' }}>{section.title}</a></div>)}</nav>
        </aside>
        <article className="legal-authority-document" aria-label={current.title} style={{ width: '100%', maxWidth: 660, flex: '0 0 660px' }}>
          <h1 style={{ margin: '0 0 10px', font: "500 30px/1.2 'Inter',sans-serif", letterSpacing: '-.022em' }}>{current.title}</h1>
          <p style={{ margin: '0 0 15px', color: '#b0431a', font: "500 12px/1.6 'IBM Plex Mono',monospace" }}>{current.subtitle}</p>
          <p style={{ margin: '0 0 15px', color: '#3d3a36', font: "400 13.5px/1.75 'Inter',sans-serif" }}>These routes expose missing approval plainly so an unapproved draft cannot be mistaken for operative terms.</p>
          {current.sections.map((section) => <section id={sectionId(section.title)} key={section.title} tabIndex={-1}><h2 style={{ margin: '28px 0 11px', font: "500 15.5px/1.35 'Inter',sans-serif", letterSpacing: '-.008em' }}>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} style={{ margin: '0 0 15px', color: '#3d3a36', font: "400 13.5px/1.75 'Inter',sans-serif" }}>{paragraph}</p>)}</section>)}
          <footer style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 30, paddingTop: 16, borderTop: '1px solid #ece9e4', color: '#64686d', fontSize: 12 }}><span>Product-support questions only: <a href="mailto:support@unauth.app">support@unauth.app</a></span><span style={{ flex: 1 }} /><PrintButton /></footer>
        </article>
      </main>
      <style>{`@media(max-width:720px){.legal-authority-layout{display:block!important;padding:30px 20px 42px!important}.legal-authority-nav{width:100%!important;max-width:100%!important;display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 0 24px!important}.legal-authority-nav>nav{grid-column:1/-1;display:flex;gap:14px;overflow-x:auto}.legal-authority-nav>nav>div{min-width:max-content}.legal-authority-nav>div{margin-top:0!important}.legal-authority-document{width:100%!important;max-width:100%!important;flex:0 1 auto!important}.legal-authority-document h1{font-size:26px!important}.legal-authority-document footer{align-items:flex-start!important;flex-wrap:wrap}}`}</style>
    </div>
  );
}
