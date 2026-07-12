import { redirect } from 'next/navigation';

export default function LegacyGlobalRedirect() {
  redirect('/customers');
}
