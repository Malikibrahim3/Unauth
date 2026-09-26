import ExactNotFound from '@/components/system/ExactNotFound';

export default function CustomerNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="customer-not-found" returnHref="/customers" />;
}
