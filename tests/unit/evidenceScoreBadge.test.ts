import {
  evidenceSummaryText,
  formatEvidenceBreakdownText,
  EVIDENCE_LEVEL_LABELS,
} from '@/components/identity/EvidenceScoreBadge';

describe('EvidenceScoreBadge helpers', () => {
  const disclosed = {
    evidence_disclosed: true,
    evidence_score: 62,
    evidence_level: 'substantial' as const,
    has_sufficient_data: true,
    score_breakdown: [
      { factor: 'network_claim_frequency', label: 'Claims across the network', points: 18, max_points: 35, reason: 'x' },
    ],
    confidence_grade: 'probable' as const,
  };

  it('renders disclosed sufficient summary with score and level', () => {
    expect(evidenceSummaryText(disclosed)).toBe('Evidence: 62 · Substantial');
    expect(EVIDENCE_LEVEL_LABELS.substantial).toBe('Substantial');
  });

  it('renders insufficient and withheld summaries', () => {
    expect(evidenceSummaryText({ ...disclosed, has_sufficient_data: false })).toBe('Not enough evidence yet');
    expect(evidenceSummaryText({ ...disclosed, evidence_disclosed: false })).toBe(
      'Not enough network coverage to share',
    );
  });

  it('flattens breakdown factors when sufficient', () => {
    expect(formatEvidenceBreakdownText(disclosed)).toBe('Claims across the network 18/35');
  });

  it('uses neutral breakdown copy when withheld or insufficient', () => {
    expect(formatEvidenceBreakdownText({ ...disclosed, evidence_disclosed: false })).toContain('coverage threshold');
    expect(formatEvidenceBreakdownText({ ...disclosed, has_sufficient_data: false })).toContain(
      'Not enough evidence',
    );
  });

  it('does not use risk or fraud wording in helper output', () => {
    const forbidden = [/\brisk\b/i, /\bfraud\b/i, /\bfraudster\b/i];
    const copy = [
      evidenceSummaryText(disclosed),
      formatEvidenceBreakdownText(disclosed),
      evidenceSummaryText({ ...disclosed, evidence_disclosed: false }),
    ];
    expect(copy.some((line) => forbidden.some((re) => re.test(line)))).toBe(false);
  });
});
