import { redirect } from 'next/navigation';

export default function LegacyWatchlistRedirect() {
  redirect('/customers');
}
