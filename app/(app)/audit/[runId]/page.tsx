import { redirect } from 'next/navigation';

export default function LegacyAuditRunRedirect() {
  redirect('/reports');
}
