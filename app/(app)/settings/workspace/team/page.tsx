import TeamSettingsPage from './TeamSettingsPage';
import { acceptanceScenarioFromHeaders, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function TeamSettingsRoute() {
  await throwForAcceptanceScenario('team-error');
  return <TeamSettingsPage forceEmpty={await acceptanceScenarioFromHeaders() === 'team-empty'} />;
}
