// The Lookup page has been consolidated into the Customers page.
// This file exists only as a redirect to avoid broken external links.
import { redirect } from 'next/navigation';

export default async function LookupRedirect({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedSearchParams.email) params.set('q', resolvedSearchParams.email);
  redirect(`/customers${params.toString() ? `?${params}` : ''}`);
}
