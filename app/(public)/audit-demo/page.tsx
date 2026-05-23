import AuditDemoClient from './AuditDemoClient';

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
