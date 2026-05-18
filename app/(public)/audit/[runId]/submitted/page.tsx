import { redirect } from 'next/navigation';

interface SubmittedPageProps {
  params: Promise<{ runId: string }>;
}

export const metadata = {
  title: 'Audit running — Unauth',
};

export default async function SubmittedPage({ params }: SubmittedPageProps) {
  const { runId } = await params;
  redirect(`/audit/submitted?audit=${encodeURIComponent(runId)}`);
}
