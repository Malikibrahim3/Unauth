import { redirect } from 'next/navigation';

export default function LegacyCatchesRedirect() {
  redirect('/claims');
}
