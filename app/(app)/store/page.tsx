import { redirect } from 'next/navigation';

export default function LegacyStoreRedirect() {
  redirect('/dashboard');
}
