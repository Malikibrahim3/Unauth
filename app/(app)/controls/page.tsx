import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

export default async function ControlsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<RedirectSearchParams>;
}) {
  redirect(preservedRedirectTarget('/controls/rules', await searchParams));
}
