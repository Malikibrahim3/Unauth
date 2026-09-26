import ExactNotFound from '@/components/system/ExactNotFound';

export default function FlowNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="flow-not-found" returnHref="/controls/flows" />;
}
