"use client";

import { useMemo, useReducer, useState, type FormEvent } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export default function TeamManagementClient() {
  const [state, dispatch] = useReducer(teamManagementReducer, initialTeamManagementState);
  const [transferRequest, setTransferRequest] = useState<{
    member: TeamMember;
    idempotencyKey: string;
  } | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState('');
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

  async function loadTeam(preserveMessage = false) {
    if (!preserveMessage) dispatch({ type: 'patch', patch: { message: null } });
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
      await loadTeam(true);
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
    if (nextRole === 'owner') {
      setTransferRequest({ member, idempotencyKey: crypto.randomUUID() });
      setTransferConfirmation('');
      return;
    }
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
      await loadTeam(true);
    } catch (error) {
      dispatch({
        type: 'patch',
        patch: { message: { type: 'error', text: error instanceof Error ? error.message : 'Role update failed.' } },
      });
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  async function transferOwnership() {
    if (!transferRequest || transferConfirmation !== 'TRANSFER') return;
    const { member, idempotencyKey } = transferRequest;
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ role: 'owner', confirmOwnershipTransfer: true }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setTransferRequest(null);
      setTransferConfirmation('');
      dispatch({
        type: 'patch',
        patch: {
          message: {
            type: 'success',
            text: `Ownership transferred to ${member.invited_email}. Your role is now administrator.`,
          },
        },
      });
      await loadTeam(true);
    } catch (error) {
      dispatch({
        type: 'patch',
        patch: {
          message: {
            type: 'error',
            text: error instanceof Error ? error.message : 'Ownership transfer failed.',
          },
        },
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
      await loadTeam(true);
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
    <div className="space-y-3">
      {message ? (
        <output
          className="block rounded-md border px-3 py-2 text-sm"
          style={{
            background: message.type === 'success' ? 'var(--success-bg)' : 'var(--sev-definite-fill)',
            borderColor: message.type === 'success' ? 'var(--success-bd)' : 'color-mix(in srgb, var(--success) 35%, var(--border))',
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

      <Modal
        open={transferRequest != null}
        onClose={() => {
          if (transferRequest && busyMemberId === transferRequest.member.id) return;
          setTransferRequest(null);
          setTransferConfirmation('');
        }}
        title="Transfer workspace ownership?"
        description="This changes who controls ownership, billing, access, and future transfers."
        size="sm"
        closeOnBackdrop={transferRequest == null || busyMemberId !== transferRequest.member.id}
      >
        {transferRequest ? (
          <div className="space-y-4">
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text)' }}>{transferRequest.member.invited_email}</strong> will become the only workspace owner. Your account will remain an administrator.
            </p>
            <label className="block text-sm font-medium" style={{ color: 'var(--text)' }}>
              Type <strong>TRANSFER</strong> to confirm
              <input
                value={transferConfirmation}
                onChange={(event) => setTransferConfirmation(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-md border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--bg-inset)', borderColor: 'var(--border)', outlineColor: 'var(--accent)' }}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busyMemberId === transferRequest.member.id}
                onClick={() => {
                  setTransferRequest(null);
                  setTransferConfirmation('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={transferConfirmation !== 'TRANSFER' || busyMemberId === transferRequest.member.id}
                onClick={transferOwnership}
              >
                {busyMemberId === transferRequest.member.id ? 'Transferring…' : 'Transfer ownership'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
