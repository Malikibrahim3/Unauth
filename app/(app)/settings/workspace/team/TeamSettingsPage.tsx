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
      subtitle="Invite members, apply exact roles, transfer ownership, and remove access. Every role change is enforced by the server and retained in the audit trail."
      surfaceId="team-management"
      layout="wide"
      truth={{
        access: "Workspace owner or a permitted administrator",
        currentState: "Active membership, pending invitations, roles, and ownership",
        saveBehavior: "Each invite or access change is confirmed separately by the server",
        impact: "Changes workspace access and append an audit event; ownership transfer is separately confirmed",
      }}
    >
      <TeamManagementClient />
    </SettingsPageShell>
  );
}
