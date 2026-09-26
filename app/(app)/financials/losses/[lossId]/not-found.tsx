import ExactNotFound from '@/components/system/ExactNotFound';

export default function LossNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="connected-record-not-found" returnHref="/financials/losses" />;
}
