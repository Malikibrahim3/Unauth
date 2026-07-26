import TeamManagementClient from "@/components/settings/TeamManagementClient";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

/*
 * The client owns its own KPI group, toolbar, table and audit section, so the
 * shell must not wrap it in a further bordered card — spec §6.4 forbids nesting
 * free-standing bordered surfaces inside one another. The global utility header
 * owns the breadcrumb (§4.3), so the page does not restate it.
 */
export default function TeamSettingsPage() {
  return (
    <SettingsPageShell
      title="Team"
      subtitle="Invite analysts to investigate customers alongside you. The account owner manages billing and team access."
    >
      <TeamManagementClient />
    </SettingsPageShell>
  );
}
