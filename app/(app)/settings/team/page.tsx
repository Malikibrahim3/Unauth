import Link from "next/link";
import { Users, ArrowLeft } from "lucide-react";
import TeamManagementClient from "@/components/settings/TeamManagementClient";
import { SectionCard } from "@/components/ui/SectionCard";

export default function TeamSettingsPage() {
  return (
    <div className="max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <div
          className="flex items-center gap-2 text-sm mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          <Link href="/settings" className="hover:opacity-80 transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span>Team</span>
        </div>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" style={{ color: "var(--icon-muted)" }} />
          <h1 className="text-heading-lg" style={{ color: "var(--text)" }}>
            Team management
          </h1>
        </div>
        <p
          className="mt-2 max-w-2xl text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Invite analysts to investigate customers alongside you. The account
          owner manages billing and team access.
        </p>
      </div>

      <SectionCard
        title="Team"
        description="Roles, invitations, and recent access changes"
      >
        <TeamManagementClient />
      </SectionCard>

      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </Link>
    </div>
  );
}
