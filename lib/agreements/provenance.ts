export type AgreementProvenance = {
  agreement_id: string;
  clause_id?: string | null;
  page_number?: number | null;
  source_location?: string | null;
  excerpt: string;
};

export function buildAgreementProvenance(input: AgreementProvenance): Record<string, unknown> {
  return {
    agreement_id: input.agreement_id,
    clause_id: input.clause_id ?? null,
    page_number: input.page_number ?? null,
    source_location: input.source_location ?? null,
    excerpt: input.excerpt.slice(0, 500),
  };
}
