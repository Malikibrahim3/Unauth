"use client";

import { useMemo, useReducer, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { Modal } from '@/components/ui/Modal';
import { OperationalState } from '@/components/ui/OperationalState';
import { Select } from '@/components/ui/Select';
import { Surface } from '@/components/ui/Surface';
import styles from '@/components/settings/OperationsSettings.module.css';

export default function TeamManagementClient() {
  const [state, dispatch] = useReducer(teamManagementReducer, initialTeamManagementState);
  const [transferRequest, setTransferRequest] = useState<{
    member: TeamMember;
    idempotencyKey: string;
  } | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState('');
  const [removalTarget, setRemovalTarget] = useState<TeamMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const requestedRole = searchParams.get('role') ?? 'all';
  const roleFilter: 'all' | (typeof UI_ASSIGNABLE_ROLES)[number] =
    (UI_ASSIGNABLE_ROLES as readonly string[]).includes(requestedRole)
      ? requestedRole as (typeof UI_ASSIGNABLE_ROLES)[number]
      : 'all';
  const { email, role, submitting, busyMemberId, message } = state;

  const {
    data: teamData,
    loading,
    error: teamError,
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
  const currentUserRole = currentUser?.role ?? null;

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

  function setQueryFilter(key: 'search' | 'role', value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  }

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
    const next = new URLSearchParams(searchParams.toString());
    next.delete('search');
    next.delete('role');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
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
    setInviteError(null);
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
      setInviteError(error instanceof Error ? error.message : 'Invite failed.');
    } finally {
      dispatch({ type: 'patch', patch: { submitting: false } });
    }
  }

  async function changeRole(member: TeamMember, nextRole: TeamRole) {
    if (member.role === nextRole) return;
    if (nextRole === 'owner') {
      dispatch({ type: 'patch', patch: { message: null } });
      setTransferError(null);
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
    setTransferError(null);
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
      setTransferError(error instanceof Error ? error.message : 'Ownership transfer failed.');
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  async function removeMember(member: TeamMember) {
    setRemovalError(null);
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, confirmingId: null, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({
        type: 'patch',
        patch: { message: { type: 'success', text: `${member.invited_email} was removed from the team.` } },
      });
      setRemovalTarget(null);
      await loadTeam(true);
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : 'Remove failed.');
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  if (teamError && !teamData) {
    return (
      <Surface structure="working">
        <OperationalState
          kind="error"
          title="Team registry unavailable"
          description={`${teamError} No member counts or rows are shown because the workspace team could not be verified.`}
          action={<Button type="button" variant="secondary" onClick={() => reloadTeam()}>Try again</Button>}
        />
      </Surface>
    );
  }


  return (
    <>
      <div className={styles.stack}>
      {message ? (
        <output
          className="block border-b px-4 py-3 text-[length:var(--uo-route-text-dense-size)]"
          style={{
            background: message.type === 'success' ? 'var(--uo-route-success-bg)' : 'var(--uo-route-critical-bg)',
            borderColor: message.type === 'success' ? 'var(--uo-route-success-border)' : 'var(--uo-route-critical-border)',
            color: 'var(--uo-route-text-primary)',
          }}
        >
          {message.text}
        </output>
      ) : null}

      <Surface structure="joined" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ua-text-working-title text-[var(--uo-route-text-primary)]">Team summary</h2>
          <p className="mt-1 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-secondary)]">
            {loading
              ? 'Loading workspace members…'
              : `${activeMembers.length} active · ${pendingMembers.length} pending invite${pendingMembers.length === 1 ? '' : 's'} · ${auditTrail.length} recent access change${auditTrail.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {!loading && !canManageTeam ? (
          <p className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-tertiary)]">
            View-only access
          </p>
        ) : null}
      </Surface>

      {/* Toolbar, table, and result count belong to one working surface (§6.6). */}
      <Surface structure="joined" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--uo-route-border-subtle)] px-3 py-2.5">
          <div className="w-full shrink-0 sm:w-[240px]">
            <Input
              type="search"
              value={search}
              aria-label="Search members"
              placeholder="Search members…"
              onChange={(event) => setQueryFilter('search', event.target.value)}
            />
          </div>
          {/* Select renders a full-width wrapper, so the width lives on a sized box. */}
          <div className="w-[140px] shrink-0">
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) => setQueryFilter('role', event.target.value)}
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
              onClick={() => {
                dispatch({ type: 'patch', patch: { message: null } });
                setInviteError(null);
                setInviteOpen(true);
              }}
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
          currentUserId={currentUser?.id ?? null}
          currentUserRole={currentUserRole}
          busyMemberId={busyMemberId}
          onChangeRole={changeRole}
          onRemove={(member) => {
            dispatch({ type: 'patch', patch: { message: null } });
            setRemovalError(null);
            setRemovalTarget(member);
          }}
          emptyState={
            <EmptyState
              title={filtersActive ? 'No members match these filters' : 'No team members yet'}
              description={
                filtersActive
                  ? 'Clear the search or filters to see everyone with workspace access.'
                  : 'Invite a workspace member with the least privilege their work requires.'
              }
              action={
                filtersActive ? (
                  <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <span className="ua-text-body text-[var(--uo-route-text-secondary)]">
                    Use the invitation controls above to add a team member.
                  </span>
                )
              }
            />
          }
        />

        <div className="flex items-center justify-between gap-3 border-t border-[var(--uo-route-border-subtle)] px-3 py-2">
          <p className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-tertiary)]">
            {loading
              ? 'Loading members…'
              : `Showing ${visibleMembers.length} of ${allMembers.length} member${allMembers.length === 1 ? '' : 's'}`}
          </p>
          {!canManageTeam ? (
            <p className="text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-tertiary)]">
              Your role can view the team but cannot invite members or change roles.
            </p>
          ) : null}
        </div>
      </Surface>

      <TeamAuditTrailSection auditTrail={auditTrail} joined />

      </div>

      <TeamInviteDialog
        open={inviteOpen}
        email={email}
        role={role}
        submitting={submitting}
        error={inviteError}
        currentUserRole={currentUserRole ?? 'viewer'}
        onEmailChange={(value) => {
          setInviteError(null);
          dispatch({ type: 'patch', patch: { email: value } });
        }}
        onRoleChange={(value) => dispatch({ type: 'patch', patch: { role: value } })}
        onSubmit={inviteMember}
        onClose={() => {
          setInviteOpen(false);
          setInviteError(null);
        }}
      />

      <Modal
        open={transferRequest != null}
        onClose={() => {
          if (transferRequest && busyMemberId === transferRequest.member.id) return;
          setTransferRequest(null);
          setTransferConfirmation('');
          setTransferError(null);
        }}
        title="Transfer workspace ownership?"
        description="This changes who controls ownership, billing, access, and future transfers."
        size="sm"
        overlayId="transfer-ownership"
        closeOnBackdrop={transferRequest == null || busyMemberId !== transferRequest.member.id}
        closeOnEscape={transferRequest == null || busyMemberId !== transferRequest.member.id}
        showCloseButton={transferRequest == null || busyMemberId !== transferRequest.member.id}
      >
        {transferRequest ? (
          <div className="space-y-4">
            <p className="ua-text-body leading-6" style={{ color: 'var(--uo-route-text-secondary)' }}>
              <strong style={{ color: 'var(--uo-route-text-primary)' }}>{transferRequest.member.invited_email}</strong> will become the only workspace owner. Your account will remain an administrator.
            </p>
            <dl className="grid gap-3 rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-surface-secondary)] p-3">
              <div><dt className="ua-text-metadata">Current owner</dt><dd className="ua-text-body mt-1">Your account · becomes administrator after confirmation</dd></div>
              <div><dt className="ua-text-metadata">New owner</dt><dd className="ua-text-body mt-1 break-all">{transferRequest.member.invited_email} · controls ownership, billing, access, and future transfers</dd></div>
              <div><dt className="ua-text-metadata">Recovery</dt><dd className="ua-text-body mt-1">The new owner must transfer ownership again; there is no automatic rollback.</dd></div>
              <div><dt className="ua-text-metadata">Audit result</dt><dd className="ua-text-body mt-1">The transfer and both resulting roles are appended to workspace history.</dd></div>
            </dl>
            <label className="ua-text-body block font-medium" style={{ color: 'var(--uo-route-text-primary)' }}>
              Type <strong>TRANSFER</strong> to confirm
              <input
                value={transferConfirmation}
                onChange={(event) => setTransferConfirmation(event.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-md border px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                style={{ background: 'var(--uo-route-surface-secondary)', borderColor: 'var(--uo-route-border-default)', outlineColor: 'var(--uo-route-action-primary)' }}
              />
            </label>
            {transferError ? <p role="alert" className="rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-critical)]">{transferError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busyMemberId === transferRequest.member.id}
                onClick={() => {
                  setTransferRequest(null);
                  setTransferConfirmation('');
                  setTransferError(null);
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

      <Modal
        open={removalTarget != null}
        onClose={() => {
          if (!removalTarget || busyMemberId === removalTarget.id) return;
          setRemovalTarget(null);
          setRemovalError(null);
        }}
        title={removalTarget?.invite_status === 'pending' ? 'Revoke this invitation?' : 'Remove workspace access?'}
        description="This is an immediate access change and will be recorded in the audit trail."
        size="sm"
        overlayId="remove-team-member"
        closeOnBackdrop={removalTarget == null || busyMemberId !== removalTarget.id}
        closeOnEscape={removalTarget == null || busyMemberId !== removalTarget.id}
        showCloseButton={removalTarget == null || busyMemberId !== removalTarget.id}
      >
        {removalTarget ? <div className="grid gap-5"><p className="ua-text-body text-[var(--uo-route-text-secondary)]"><strong className="text-[var(--uo-route-text-primary)]">{removalTarget.invited_email}</strong> will no longer be able to access this workspace. Existing records and attributed audit events remain unchanged.</p>{removalError ? <p role="alert" className="rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-critical)]">{removalError}</p> : null}<div className="flex justify-end gap-2"><Button variant="secondary" disabled={busyMemberId === removalTarget.id} onClick={() => { setRemovalTarget(null); setRemovalError(null); }}>Go back</Button><Button variant="danger" loading={busyMemberId === removalTarget.id} onClick={() => void removeMember(removalTarget)}>{removalTarget.invite_status === 'pending' ? 'Revoke invitation' : 'Remove access'}</Button></div></div> : null}
      </Modal>
    </>
  );
}
