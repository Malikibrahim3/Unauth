import { redirect } from 'next/navigation';
import { getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

export default async function SourcesIndexPage({
  searchParams,
}: {
  searchParams?: Promise<RedirectSearchParams>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  redirect(preservedRedirectTarget('/sources/connected', await searchParams));
}
