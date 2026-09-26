import ExactNotFound from '@/components/system/ExactNotFound';

export default function SourceNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="source-not-found" returnHref="/sources/connected" />;
}
