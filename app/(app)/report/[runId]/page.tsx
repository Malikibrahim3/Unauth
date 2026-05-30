import { redirect } from 'next/navigation';

interface ReportRedirectProps {
  params: Promise<{ runId: string }>;
}

export default async function ReportRedirectPage({ params }: ReportRedirectProps) {
  const { runId } = await params;
  redirect(`/audit/${runId}`);
}
