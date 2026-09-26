import ExactNotFound from '@/components/system/ExactNotFound';

export default function NamedReportNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="named-report-not-found" returnHref="/financials/reports" />;
}
