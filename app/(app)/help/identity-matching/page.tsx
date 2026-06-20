import { redirect } from 'next/navigation';

export default function LegacyIdentityMatchingRedirect() {
  redirect('/help');
}
