export type OnboardingNextInput = {
  commerceConnected: boolean;
  importStatus: string | null;
  importHref: string;
  usableRecords: boolean;
  firstCaseId: string | null;
  hasLosses: boolean;
  observedRows: number | null;
};

/** One task, in the order adopted by M15. Missing observations stay explicit. */
export function onboardingNextStep(input: OnboardingNextInput) {
  if (!input.commerceConnected) return { label: 'Connect Shopify', href: '/sources/setup/shopify' };
  if (!input.usableRecords && ['failed', 'dead_letter', 'sync_failed'].includes(input.importStatus ?? '')) return { label: 'Fix import', href: input.importHref };
  if (!input.usableRecords && ['queued', 'running', 'importing', 'import_queued', 'pending'].includes(input.importStatus ?? '')) return { label: 'View import progress', href: input.importHref };
  if (!input.importStatus && !input.usableRecords) return { label: 'Import order history', href: '/sources/shopify' };
  if (input.firstCaseId) return { label: 'Review your first case', href: `/cases/${encodeURIComponent(input.firstCaseId)}` };
  if (input.hasLosses) return { label: 'Review imported losses', href: '/financials/losses' };
  return { label: 'Check import coverage', href: input.importHref, detail: `${input.observedRows == null ? 'Returned row count unavailable' : `${input.observedRows} rows returned`}. Historical coverage dates are not retained in this observation; review the source import scope.` };
}
