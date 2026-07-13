"use client";

import { Shield } from "lucide-react";
import { TeamMemberRow } from "@/components/settings/TeamMemberRow";
import type {
  TeamMember,
  TeamRole,
} from "@/components/settings/teamManagementTypes";

type TeamMembersSectionProps = {
  title: string;
  subtitle: string;
  loading: boolean;
  emptyMessage: string;
  members: TeamMember[];
  canManageTeam: boolean;
  isAccountOwner: boolean;
  busyMemberId: string | null;
  confirmingId: string | null;
  onChangeRole: (member: TeamMember, nextRole: TeamRole) => void;
  onConfirmRemove: (memberId: string) => void;
  onCancelRemove: () => void;
  onRemove: (member: TeamMember) => void;
  showIcon?: boolean;
};

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ""}`}
      style={{ background: "var(--bg-subtle, var(--border))" }}
      aria-hidden="true"
    />
  );
}

function TeamMembersSkeleton() {
  return (
    <div
      className="divide-y"
      style={{ borderColor: "var(--border-muted)" }}
      aria-busy="true"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Bone className="h-8 w-8 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Bone className="h-3.5 w-36 max-w-full" />
              <Bone className="h-3 w-48 max-w-full" />
            </div>
          </div>
          <Bone className="h-6 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function TeamMembersSection({
  title,
  subtitle,
  loading,
  emptyMessage,
  members,
  canManageTeam,
  isAccountOwner,
  busyMemberId,
  confirmingId,
  onChangeRole,
  onConfirmRemove,
  onCancelRemove,
  onRemove,
  showIcon = false,
}: TeamMembersSectionProps) {
  return (
    <section
      className="rounded-md border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border-muted)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text)" }}
          >
            {title}
          </h2>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {subtitle}
          </p>
        </div>
        {showIcon ? (
          <Shield className="h-5 w-5" style={{ color: "var(--icon-muted)" }} />
        ) : null}
      </div>

      {loading ? (
        <TeamMembersSkeleton />
      ) : members.length === 0 ? (
        <p
          className="px-5 py-6 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {emptyMessage}
        </p>
      ) : (
        <div
          className="divide-y"
          style={{ borderColor: "var(--border-muted)" }}
        >
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              canManageTeam={canManageTeam}
              isAccountOwner={isAccountOwner}
              busyMemberId={busyMemberId}
              confirmingId={confirmingId}
              onChangeRole={onChangeRole}
              onConfirmRemove={onConfirmRemove}
              onCancelRemove={onCancelRemove}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
