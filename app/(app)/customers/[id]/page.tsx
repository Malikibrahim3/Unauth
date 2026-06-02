import { CustomerProfileBlockedView, CustomerProfilePageView } from '@/app/(app)/customers/[id]/CustomerProfilePageView';
import {
  loadCustomerProfilePage,
  type CustomerProfileSearchParams,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams:
    | Promise<CustomerProfileSearchParams>
    | CustomerProfileSearchParams;
}

export default async function CustomerProfilePage({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ]);

  const result = await loadCustomerProfilePage(resolvedParams.id, resolvedSearchParams);

  if (result.blocked) {
    return <CustomerProfileBlockedView reason={result.reason} />;
  }

  return <CustomerProfilePageView {...result.props} />;
}
