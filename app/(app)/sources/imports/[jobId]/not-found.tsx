import ExactNotFound from '@/components/system/ExactNotFound';

export default function ImportJobNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="import-job-not-found" returnHref="/sources/imports" />;
}
