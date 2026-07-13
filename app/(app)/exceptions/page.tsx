import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Compatibility destination: automation exceptions are now a saved Work view. */
export default function ExceptionsPage() {
  redirect('/work?view=integration-exceptions');
}
