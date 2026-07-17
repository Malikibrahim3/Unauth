import TeamManagementClient from "@/components/settings/TeamManagementClient";
import { SectionCard } from "@/components/ui/SectionCard";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";

export default function TeamSettingsPage() {
  return (
    <SettingsPageShell
      eyebrow="Workspace access"
      title="Team management"
      subtitle="Invite analysts to investigate customers alongside you. The account owner manages billing and team access."
      breadcrumbs={[{ label: "Settings", href: "/settings/account" }, { label: "Team" }]}
    >
      <SectionCard
        title="Team"
        description="Roles, invitations, and recent access changes"
      >
        <TeamManagementClient />
      </SectionCard>
    </SettingsPageShell>
  );
}
