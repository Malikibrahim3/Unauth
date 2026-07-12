import { redirect } from 'next/navigation';

export default function LegacyChargebackDetailRedirect() {
  redirect('/claims');
}
