import Image from 'next/image';
import { DEMO_EVIDENCE_VISUALS } from '@/lib/demo/merchantCaseV1';
import styles from './public.module.css';

export function SampleRecordPreview({ label, result, source }: { label: string; result: string; source: string }) {
  return <span className={styles.sampleEvidenceRecord} aria-hidden="true">
    <span>{label}</span><strong>{result}</strong><small>{source}</small>
  </span>;
}

/** A single, case-specific evidence cue beside the factual evidence text. */
export function SampleEvidenceVisual({ caseId }: { caseId: string }) {
  const evidence = DEMO_EVIDENCE_VISUALS[caseId];
  if (!evidence) return null;
  if (evidence.kind === 'photo') {
    return <span className={styles.sampleEvidencePhoto}>
      <Image src={evidence.src} alt={evidence.alt} width={56} height={56} unoptimized />
    </span>;
  }
  return <SampleRecordPreview label={evidence.label} result={evidence.result} source={evidence.source} />;
}
