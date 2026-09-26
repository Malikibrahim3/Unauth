import ExactNotFound from '@/components/system/ExactNotFound';

export default function RuleNotFound() {
  return <ExactNotFound data-route-presentation="not-found" stateId="rule-not-found" returnHref="/controls/rules" />;
}
