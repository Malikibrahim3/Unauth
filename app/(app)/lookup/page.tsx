// The Lookup page has been consolidated into the Customers page.
// This file exists only as a redirect to avoid broken external links.
import { redirect } from 'next/navigation';

export default function LookupRedirect({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.email) params.set('q', searchParams.email);
  redirect(`/customers${params.toString() ? `?${params}` : ''}`);
}

