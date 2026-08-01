import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

export const dynamic = 'force-dynamic';

/** Compatibility destination: automation exceptions are now a saved Work view. */
type ExceptionsPageProps = {
  searchParams?: Promise<RedirectSearchParams>;
};

export default async function ExceptionsPage({ searchParams }: ExceptionsPageProps) {
  redirect(
    preservedRedirectTarget('/work', await searchParams, {
      force: { view: 'integration-exceptions' },
    }),
  );
}
