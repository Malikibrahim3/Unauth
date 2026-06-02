'use client';

import { Shield } from 'lucide-react';
import { TeamMemberRow } from '@/components/settings/TeamMemberRow';
import type { TeamMember, TeamRole } from '@/components/settings/teamManagementTypes';

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
    <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        {showIcon ? <Shield className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} /> : null}
      </div>

      {loading ? (
        <div className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading team…</div>
      ) : members.length === 0 ? (
        <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
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
