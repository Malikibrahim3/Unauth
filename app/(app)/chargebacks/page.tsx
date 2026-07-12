import { redirect } from 'next/navigation';

export default function LegacyChargebacksRedirect() {
  redirect('/claims');
}
