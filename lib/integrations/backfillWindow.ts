/** How far back store and helpdesk connectors pull data on initial connect. */
export const INTEGRATION_BACKFILL_MONTHS = 24;

export function integrationBackfillSinceDate(): Date {
  const since = new Date();
  since.setMonth(since.getMonth() - INTEGRATION_BACKFILL_MONTHS);
  return since;
}

export function integrationBackfillSinceIso(): string {
  return integrationBackfillSinceDate().toISOString();
}
