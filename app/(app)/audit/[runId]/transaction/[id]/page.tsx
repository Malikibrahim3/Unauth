import { redirect } from 'next/navigation';

export default function LegacyAuditTransactionRedirect() {
  redirect('/customers');
}
