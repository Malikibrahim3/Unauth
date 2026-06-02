import type { Metadata } from 'next';
import AuditDemoClient from './AuditDemoClient';

export const metadata: Metadata = {
  title: 'Audit demo | Unauth',
  description: 'Try a siloed identity audit without signing in.',
};

export default async function AuditDemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const emailParam = params.email;
  const initialEmail = Array.isArray(emailParam) ? emailParam[0] ?? '' : emailParam ?? '';

  return <AuditDemoClient initialEmail={initialEmail} />;
}
