"use client";

import { useMemo, useReducer, type FormEvent } from 'react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  initialTeamManagementState,
  teamManagementReducer,
} from '@/components/settings/teamManagementReducer';
import { TeamAuditTrailSection } from '@/components/settings/TeamAuditTrailSection';
import { TeamInviteForm } from '@/components/settings/TeamInviteForm';
import { TeamMembersSection } from '@/components/settings/TeamManagementSections';
import {
  messageFromResponse,
  ROLE_LABELS,
  type TeamMember,
  type TeamResponse,
  type TeamRole,
} from '@/components/settings/teamManagementTypes';

export default function TeamManagementClient() {
  const [state, dispatch] = useReducer(teamManagementReducer, initialTeamManagementState);
  const { email, role, submitting, busyMemberId, confirmingId, message } = state;

  const {
    data: teamData,
    loading,
    reload: reloadTeam,
  } = useFetchJson<TeamResponse>('/api/team?includeAudit=true&includeOwner=true', {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      return body;
    },
  });

  const currentUser = teamData?.currentUser ?? null;
  const canManageTeam = currentUser?.canManageTeam === true;
  const isAccountOwner = currentUser?.isAccountOwner === true;

  const activeMembers = useMemo(
    () => (teamData?.members ?? []).filter((member) => member.invite_status === 'active'),
    [teamData?.members],
  );
  const pendingMembers = useMemo(
    () => (teamData?.members ?? []).filter((member) => member.invite_status === 'pending'),
    [teamData?.members],
  );

  async function loadTeam() {
    dispatch({ type: 'patch', patch: { message: null } });
    reloadTeam();
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: 'patch', patch: { submitting: true, message: null } });
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({
        type: 'patch',
        patch: {
          email: '',
          role: 'analyst',
          message: { type: 'success', text: 'Invite sent. They will receive a magic link and join with the selected role.' },
        },
      });
      await loadTeam();
    } catch (error) {
      dispatch({
        type: 'patch',
        patch: { message: { type: 'error', text: error instanceof Error ? error.message : 'Invite failed.' } },
      });
    } finally {
      dispatch({ type: 'patch', patch: { submitting: false } });
    }
  }

  async function changeRole(member: TeamMember, nextRole: TeamRole) {
    if (member.role === nextRole) return;
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({
        type: 'patch',
        patch: { message: { type: 'success', text: `${member.invited_email} is now ${ROLE_LABELS[nextRole]}.` } },
      });
      await loadTeam();
    } catch (error) {
      dispatch({
        type: 'patch',
        patch: { message: { type: 'error', text: error instanceof Error ? error.message : 'Role update failed.' } },
      });
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  async function removeMember(member: TeamMember) {
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, confirmingId: null, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({
        type: 'patch',
        patch: { message: { type: 'success', text: `${member.invited_email} was removed from the team.` } },
      });
      await loadTeam();
    } catch (error) {
      dispatch({
        type: 'patch',
        patch: { message: { type: 'error', text: error instanceof Error ? error.message : 'Remove failed.' } },
      });
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  const memberRowHandlers = {
    canManageTeam,
    isAccountOwner,
    busyMemberId,
    confirmingId,
    onChangeRole: changeRole,
    onConfirmRemove: (memberId: string) => dispatch({ type: 'patch', patch: { confirmingId: memberId } }),
    onCancelRemove: () => dispatch({ type: 'patch', patch: { confirmingId: null } }),
    onRemove: removeMember,
  };

  return (
    <div className="space-y-6">
      {message ? (
        <output
          className="block rounded-md border px-3 py-2 text-sm"
          style={{
            background: message.type === 'success' ? 'rgba(47, 107, 67, 0.10)' : 'rgba(248, 113, 113, 0.10)',
            borderColor: message.type === 'success' ? 'rgba(47, 107, 67, 0.30)' : 'rgba(248, 113, 113, 0.35)',
            color: 'var(--text)',
          }}
        >
          {message.text}
        </output>
      ) : null}

      <TeamInviteForm
        email={email}
        role={role}
        submitting={submitting}
        canManageTeam={canManageTeam}
        currentUserRole={currentUser?.role}
        onEmailChange={(value) => dispatch({ type: 'patch', patch: { email: value } })}
        onRoleChange={(value) => dispatch({ type: 'patch', patch: { role: value } })}
        onSubmit={inviteMember}
      />

      <TeamMembersSection
        title="Active members"
        subtitle={`${activeMembers.length} active user(s)`}
        loading={loading}
        emptyMessage="No active team members yet."
        members={activeMembers}
        showIcon
        {...memberRowHandlers}
      />

      {pendingMembers.length > 0 ? (
        <TeamMembersSection
          title="Pending invites"
          subtitle={`${pendingMembers.length} invite(s) awaiting acceptance`}
          loading={false}
          emptyMessage=""
          members={pendingMembers}
          {...memberRowHandlers}
        />
      ) : null}

      <TeamAuditTrailSection auditTrail={teamData?.auditTrail ?? []} />
    </div>
  );
}
