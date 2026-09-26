import ExactNotFound from '@/components/system/ExactNotFound';

export default function FlowRunNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="flow-run-not-found" returnHref="/controls/flows/runs" />;
}
