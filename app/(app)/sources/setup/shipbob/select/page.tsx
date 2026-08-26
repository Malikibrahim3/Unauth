import ShipBobAccountSelectionClient from './ShipBobAccountSelectionClient';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';

export default async function ShipBobAccountSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string; returnTo?: string }>;
}) {
  const { selection = '', returnTo: requestedReturnTo } = await searchParams;
  const returnTo = safeRedirectPath(requestedReturnTo ?? '/sources/shipbob');
  return <ShipBobAccountSelectionClient selectionId={selection} returnTo={returnTo} />;
}
