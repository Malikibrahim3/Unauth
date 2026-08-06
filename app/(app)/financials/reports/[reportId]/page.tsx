import ReportRecordsPage from '@/app/(app)/financials/reports/records/page';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { reportId } = await params;
  const incoming = searchParams ? await searchParams : {};
  const normalized = Object.fromEntries(
    Object.entries(incoming).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  ) as Record<string, string | undefined>;

  return ReportRecordsPage({
    searchParams: Promise.resolve({ ...normalized, reportId }),
  });
}
