"use client";

import { useMemo, useReducer, useState, type FormEvent } from 'react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  initialTeamManagementState,
  teamManagementReducer,
} from '@/components/settings/teamManagementReducer';
import { TeamAuditTrailSection } from '@/components/settings/TeamAuditTrailSection';
import { TeamInviteDialog } from '@/components/settings/TeamInviteDialog';
import { TeamMembersTable } from '@/components/settings/TeamMembersTable';
import {
  messageFromResponse,
  ROLE_LABELS,
  UI_ASSIGNABLE_ROLES,
  uiRoleForMember,
  type TeamMember,
  type TeamResponse,
  type TeamRole,
} from '@/components/settings/teamManagementTypes';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { MetricGroup } from '@/components/ui/MetricGroup';
import { Modal } from '@/components/ui/Modal';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';

export default function TeamManagementClient() {
  const [state, dispatch] = useReducer(teamManagementReducer, initialTeamManagementState);
  const [transferRequest, setTransferRequest] = useState<{
    member: TeamMember;
    idempotencyKey: string;
  } | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | (typeof UI_ASSIGNABLE_ROLES)[number]>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const { email, role, submitting, busyMemberId, message } = state;

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

  const allMembers = useMemo(
    () => (teamData?.members ?? []).filter((member) => member.invite_status !== 'revoked'),
    [teamData?.members],
  );
  const activeMembers = useMemo(
    () => allMembers.filter((member) => member.invite_status === 'active'),
    [allMembers],
  );
  const pendingMembers = useMemo(
    () => allMembers.filter((member) => member.invite_status === 'pending'),
    [allMembers],
  );
  const auditTrail = teamData?.auditTrail ?? [];

  const filtersActive = search.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const visibleMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allMembers.filter((member) => {
      if (needle && !member.invited_email.toLowerCase().includes(needle)) return false;
      if (roleFilter !== 'all' && uiRoleForMember(member.role) !== roleFilter) return false;
      if (statusFilter !== 'all' && member.invite_status !== statusFilter) return false;
      return true;
    });
  }, [allMembers, search, roleFilter, statusFilter]);

  function clearFilters() {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  }

  /** Exports the filtered view, so what you see is what you get. */
  function exportCsv() {
    const header = ['Email', 'Role', 'Status', 'Joined'];
    const rows = visibleMembers.map((member) => [
      member.invited_email,
      ROLE_LABELS[member.role],
      member.invite_status,
      member.accepted_at ?? member.created_at ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-members.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

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
          message: { type: 'success', text: 'Invitation sent. They receive a magic link and join with the selected role.' },
        },
      });
      setInviteOpen(false);
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


  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <output
          className="block rounded-[var(--ua-radius-control)] border px-3 py-2 text-[length:var(--ua-text-small-size)]"
          style={{
            background: message.type === 'success' ? 'var(--ua-success-bg)' : 'var(--ua-critical-bg)',
            borderColor: message.type === 'success' ? 'var(--ua-success-border)' : 'var(--ua-critical-border)',
            color: 'var(--ua-text-primary)',
          }}
        >
          {message.text}
        </output>
      ) : null}

      {/*
        Grouped KPIs first (§5.1, §6.5) — one bordered surface, equal cells. While
        the request is in flight the values render as an em dash rather than 0, so
        the page never asserts a count it does not have yet.
      */}
      <MetricGroup
        items={[
          {
            label: 'Total members',
            value: loading ? '—' : allMembers.length,
            description: 'Active and pending',
          },
          {
            label: 'Active',
            value: loading ? '—' : activeMembers.length,
            description: 'Accepted their invitation',
          },
          {
            label: 'Pending invites',
            value: loading ? '—' : pendingMembers.length,
            description: 'Awaiting acceptance',
          },
          {
            label: 'Access changes',
            value: loading ? '—' : auditTrail.length,
            description: 'Recorded in the audit trail',
          },
        ]}
      />

      {/* Toolbar, table, and result count belong to one working surface (§6.6). */}
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ua-border-subtle)] px-3 py-2.5">
          <div className="w-full shrink-0 sm:w-[240px]">
            <Input
              type="search"
              value={search}
              aria-label="Search members"
              placeholder="Search members…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {/* Select renders a full-width wrapper, so the width lives on a sized box. */}
          <div className="w-[140px] shrink-0">
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            >
              <option value="all">All roles</option>
              {UI_ASSIGNABLE_ROLES.map((value) => (
                <option key={value} value={value}>{ROLE_LABELS[value]}</option>
              ))}
            </Select>
          </div>
          <div className="w-[150px] shrink-0">
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={exportCsv} disabled={loading || !allMembers.length}>
              Export CSV
            </Button>
            {/*
              Rendered while the permission check is still in flight and disabled
              rather than absent, so the page's primary action does not pop into
              existence after load and shift the toolbar.
            */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={loading || !canManageTeam}
              onClick={() => setInviteOpen(true)}
            >
              Invite member
            </Button>
          </div>
        </div>

        <TeamMembersTable
          members={visibleMembers}
          loading={loading}
          canManageTeam={canManageTeam}
          isAccountOwner={isAccountOwner}
          busyMemberId={busyMemberId}
          onChangeRole={changeRole}
          onRemove={removeMember}
          emptyState={
            <EmptyState
              title={filtersActive ? 'No members match these filters' : 'No team members yet'}
              description={
                filtersActive
                  ? 'Clear the search or filters to see everyone with workspace access.'
                  : 'Invite an analyst to investigate customers alongside you.'
              }
              action={
                filtersActive ? (
                  <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />

        <div className="flex items-center justify-between gap-3 border-t border-[var(--ua-border-subtle)] px-3 py-2">
          <p className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">
            {loading
              ? 'Loading members…'
              : `Showing ${visibleMembers.length} of ${allMembers.length} member${allMembers.length === 1 ? '' : 's'}`}
          </p>
          {!canManageTeam ? (
            <p className="text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-tertiary)]">
              Your role can view the team but cannot invite members or change roles.
            </p>
          ) : null}
        </div>
      </Panel>

      <TeamAuditTrailSection auditTrail={auditTrail} />

      <TeamInviteDialog
        open={inviteOpen}
        email={email}
        role={role}
        submitting={submitting}
        onEmailChange={(value) => dispatch({ type: 'patch', patch: { email: value } })}
        onRoleChange={(value) => dispatch({ type: 'patch', patch: { role: value } })}
        onSubmit={inviteMember}
        onClose={() => setInviteOpen(false)}
      />

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
            <p className="text-sm leading-6" style={{ color: 'var(--ua-text-secondary)' }}>
              <strong style={{ color: 'var(--ua-text-primary)' }}>{transferRequest.member.invited_email}</strong> will become the only workspace owner. Your account will remain an administrator.
            </p>
            <label className="block text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>
              Type <strong>TRANSFER</strong> to confirm
              <input
                value={transferConfirmation}
                onChange={(event) => setTransferConfirmation(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-md border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--ua-surface-secondary)', borderColor: 'var(--ua-border-default)', outlineColor: 'var(--ua-action-primary)' }}
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
