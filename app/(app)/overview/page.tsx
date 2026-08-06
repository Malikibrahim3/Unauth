import { redirect } from 'next/navigation';
import { CanonicalOverviewSurface } from '@/components/canonical/OverviewSurface';
import { PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { loadIntelligenceReport, parseReportRange } from '@/lib/reporting/intelligence';
import { now } from '@/lib/time/clock';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; timezone?: string; compare?: string; currency?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_DASHBOARD);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const params = await searchParams;
  const range = parseReportRange(params.range);
  const timezone = params.timezone && params.timezone.length < 80 ? params.timezone : 'UTC';
  const compare = range !== 'all' && params.compare === 'previous' ? 'previous' : 'none';
  const asOf = now();
  const report = await loadIntelligenceReport(service, ctx.merchantId, range, timezone, { asOf });
  const currencies = report.bridges.map((item) => item.currency);
  const requestedCurrency = params.currency?.toUpperCase();
  const selectedCurrency = currencies.includes(requestedCurrency ?? '') ? requestedCurrency ?? null : currencies[0] ?? null;

  return <CanonicalOverviewSurface report={report} selectedCurrency={selectedCurrency} compare={compare} />;
}
