import Link from 'next/link';
import { PrintButton } from '@/components/help/HelpCentre';
import { CompactFooter, PublicHeader } from './Challenge6PublicPages';
import styles from './Challenge6Legal.module.css';

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

export function Challenge6Legal({ doc }: { doc: DocKey }) {
  const current = DOCUMENTS[doc];
  return (
    <div className={styles.page} data-surface-id={SURFACE_IDS[doc]} data-challenge6-surface="legal" data-document={doc} data-release-status="blocked-unapproved">
      <PublicHeader />
      <main>
        <section className={styles.intro}><div><span>Legal · release blocked</span><h1>{current.title}</h1><p className={styles.subtitle}>{current.subtitle}</p><p>These routes expose missing approval plainly so an unapproved draft cannot be mistaken for operative terms.</p><nav aria-label="Legal documents">{NAV.map(([key, label, href]) => <Link href={href} aria-current={key === doc ? 'page' : undefined} key={key}>{label}</Link>)}</nav></div></section>
        <section className={styles.documentArea}><div><div className={styles.documentLayout}><aside className={styles.contents}><strong>On this page</strong><nav aria-label="On this page">{current.sections.map((section) => <a href={`#${sectionId(section.title)}`} key={section.title}>{section.title}</a>)}</nav></aside><article aria-label={current.title}>{current.sections.map((section) => <section id={sectionId(section.title)} key={section.title} tabIndex={-1}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<footer><span>Product-support questions only: <a href="mailto:support@unauth.app">support@unauth.app</a></span><i /><PrintButton /></footer></article></div></div></section>
      </main>
      <CompactFooter />
    </div>
  );
}
