export type ExtractedAgreementClause = {
  clause_type:
    | 'MIN_RECOVERABLE_ORDER_VALUE'
    | 'CLAIM_WINDOW'
    | 'EVIDENCE_REQUIRED'
    | 'LIABILITY_CAP'
    | 'DELIVERED_NOT_RECEIVED_RULE'
    | 'DAMAGE_CLAIM_RULE'
    | 'OTHER';
  clause_text: string;
  extracted_value: Record<string, unknown>;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  source_location: string | null;
};

function sentenceChunks(rawText: string): string[] {
  return rawText
    .split(/\n+|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20);
}

function extractDays(text: string): number | null {
  const match = text.match(/(\d{1,3})\s+(calendar\s+)?days?/i);
  return match ? Number(match[1]) : null;
}

function extractMoney(text: string): number | null {
  const match = text.match(/(?:\$|£|€)\s?(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

export function extractAgreementClauses(rawText: string): ExtractedAgreementClause[] {
  const clauses: ExtractedAgreementClause[] = [];
  for (const [index, chunk] of sentenceChunks(rawText).entries()) {
    const lower = chunk.toLowerCase();
    if (lower.includes('claim') && lower.includes('day')) {
      clauses.push({
        clause_type: 'CLAIM_WINDOW',
        clause_text: chunk,
        extracted_value: { deadline_days: extractDays(chunk) },
        confidence: extractDays(chunk) == null ? 'LOW' : 'MEDIUM',
        source_location: `chunk:${index + 1}`,
      });
    }
    if (lower.includes('proof') || lower.includes('evidence') || lower.includes('photo')) {
      clauses.push({
        clause_type: 'EVIDENCE_REQUIRED',
        clause_text: chunk,
        extracted_value: {
          required_evidence: [
            lower.includes('photo') ? 'photo' : null,
            lower.includes('proof of delivery') ? 'proof_of_delivery' : null,
            lower.includes('tracking') ? 'tracking' : null,
          ].filter(Boolean),
        },
        confidence: 'MEDIUM',
        source_location: `chunk:${index + 1}`,
      });
    }
    if (lower.includes('liability') || lower.includes('cap')) {
      clauses.push({
        clause_type: 'LIABILITY_CAP',
        clause_text: chunk,
        extracted_value: { liability_cap: extractMoney(chunk) },
        confidence: extractMoney(chunk) == null ? 'LOW' : 'MEDIUM',
        source_location: `chunk:${index + 1}`,
      });
    }
    if (lower.includes('delivered') && (lower.includes('not received') || lower.includes('non-receipt'))) {
      clauses.push({
        clause_type: 'DELIVERED_NOT_RECEIVED_RULE',
        clause_text: chunk,
        extracted_value: {},
        confidence: 'MEDIUM',
        source_location: `chunk:${index + 1}`,
      });
    }
  }
  return clauses;
}
