'use client';

import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { SuppliedSecurityDialog as ModalCanvas } from '@/components/visual-authority/SuppliedSecurityDialog';
import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { initialTeamManagementState, teamManagementReducer } from '@/components/settings/teamManagementReducer';
import {
  formatTeamJoinState,
  INVITE_ROLES,
  messageFromResponse,
  ROLE_LABELS,
  UI_ASSIGNABLE_ROLES,
  uiRoleForMember,
  type TeamMember,
  type TeamResponse,
  type TeamRole,
} from '@/components/settings/teamManagementTypes';

const buttonStyle = (tone: 'quiet' | 'primary' | 'danger' = 'quiet', disabled = false): CSSProperties => ({
  border: 0,
  borderRadius: 9,
  padding: '6px 11px',
  background: tone === 'primary' ? (disabled ? '#f4f3f1' : '#1c1f23') : '#fff',
  boxShadow: tone === 'primary' && disabled
    ? 'inset 0 0 0 1px #d8d4cf'
    : tone === 'quiet'
      ? 'inset 0 0 0 1px rgba(28,27,25,.11)'
      : tone === 'danger'
        ? 'inset 0 0 0 1px rgba(176,67,26,.35)'
        : 'none',
  color: tone === 'primary' ? (disabled ? '#64686d' : '#fff') : tone === 'danger' ? '#b0431a' : '#40454a',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: tone === 'primary' ? 1 : disabled ? .45 : 1,
  font: "500 12.5px/1 'Inter',sans-serif",
});

const fieldStyle: CSSProperties = {
  height: 30,
  border: 0,
  borderRadius: 8,
  padding: '0 10px',
  outline: 'none',
  boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.12)',
  background: '#fff',
  color: '#1c1f23',
  font: "400 12px/1.2 'Inter',sans-serif",
};



function initials(email: string) {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2)).toUpperCase();
}

function personLabel(member: TeamMember) {
  const local = member.invited_email.split('@')[0] ?? member.invited_email;
  return local.replace(/[._-]+/g, ' ');
}

const permissionRows = [
  ['See cases, the ledger and reports', [true, true, true, true], null],
  ['Decide a case — refund, hold or deny', [true, true, true, false], null],
  ['Refund more than the workspace limit on one case', [true, true, false, false], 'Analysts send these to an admin'],
  ['File and chase a carrier claim', [true, true, true, false], null],
  ['Edit payout rules and their order', [true, true, false, false], null],
  ['Turn a flow on or off', [true, true, false, false], null],
  ['Connect, repair or remove a source', [true, true, false, false], null],
  ['Upload an import or change a mapping', [true, true, 'limited', false], 'Analysts may upload, not remap'],
  ['Read the audit log', [true, true, true, true], null],
  ['Close a period', [true, false, false, false], 'Owner only, and it cannot be delegated'],
  ['Invite people and change roles', [true, true, false, false], null],
  ['Delete a ledger entry or an audit line', [false, false, false, false], 'No role has this. Corrections are new entries.'],
] as const;

function RoleMatrix() {
  return <section style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 10, padding: '6px 16px 8px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 72px 72px 72px 72px minmax(150px,.8fr)', alignItems: 'center', minHeight: 36, borderBottom: '1px solid #eae8e5', color: '#64686d', font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.08em' }}>
      <span style={{ color: '#64686d' }}>WHAT EACH ROLE MAY DO</span><span>OWNER</span><span>ADMIN</span><span>ANALYST</span><span>VIEWER</span><span/>
    </div>
    {permissionRows.map(([label, marks, note]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 72px 72px 72px 72px minmax(150px,.8fr)', alignItems: 'center', minHeight: 32, borderBottom: '1px solid #f4f2ef', color: '#1c1f23', font: "400 11.5px/1.3 'Inter',sans-serif" }}>
      <span style={{ color: marks.every((mark) => mark === false) ? '#64686d' : '#1c1f23' }}>{label}</span>
      {marks.map((mark, index) => <span key={index} aria-label={mark === true ? 'Allowed' : mark === 'limited' ? 'Allowed with a limit' : 'Not allowed'} style={{ color: mark === true ? '#1c1f23' : mark === 'limited' ? '#b47d14' : '#a7abad', font: mark === true ? "700 17px/1 'Inter',sans-serif" : "400 13px/1 'Inter',sans-serif" }}>{mark === true ? '●' : mark === 'limited' ? '○' : '—'}</span>)}
      <span style={{ color: '#64686d', font: "400 10px/1.35 'Inter',sans-serif" }}>{note}</span>
    </div>)}
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 10, color: '#64686d', font: "400 10px/1.35 'Inter',sans-serif" }}>
      <span><b style={{ color: '#1c1f23' }}>●</b> allowed</span><span><b style={{ color: '#b47d14' }}>○</b> allowed with a limit</span><span><b style={{ color: '#a7abad' }}>—</b> not allowed</span><span style={{ marginLeft: 'auto' }}>Roles are fixed. Per-person exceptions are deliberately not offered.</span>
    </div>
  </section>;
}

export default function TeamManagementClient({ forceEmpty = false }: { forceEmpty?: boolean }) {
  const [state, dispatch] = useReducer(teamManagementReducer, initialTeamManagementState);
  const [transferRequest, setTransferRequest] = useState<{ member: TeamMember; idempotencyKey: string } | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState('');
  const transferConfirmationRef = useRef<HTMLInputElement>(null);
  const [removalTarget, setRemovalTarget] = useState<TeamMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [removalError, setRemovalError] = useState<string | null>(null);

  useEffect(() => {
    if (!transferRequest) return;
    const input = transferConfirmationRef.current;
    if (!input) return;
    const syncConfirmation = () => setTransferConfirmation(input.value.trim());
    syncConfirmation();
    input.addEventListener('input', syncConfirmation);
    input.addEventListener('change', syncConfirmation);
    return () => {
      input.removeEventListener('input', syncConfirmation);
      input.removeEventListener('change', syncConfirmation);
    };
  }, [transferRequest]);

  const searchParams = useSearchParams();
  const search = searchParams.get('search')?.trim().toLowerCase() ?? '';
  const requestedRole = searchParams.get('role') ?? 'all';
  const roleFilter: 'all' | (typeof UI_ASSIGNABLE_ROLES)[number] = (UI_ASSIGNABLE_ROLES as readonly string[]).includes(requestedRole) ? requestedRole as (typeof UI_ASSIGNABLE_ROLES)[number] : 'all';
  const { email, role, submitting, busyMemberId, message } = state;

  const { data: teamData, loading, error: teamError, reload: reloadTeam } = useFetchJson<TeamResponse>('/api/team?includeAudit=true&includeOwner=true', {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      if (!Array.isArray(body.members)) throw new Error('The team service did not return verified member counts.');
      return body;
    },
  });
  const countsAvailable = !loading && !teamError && Array.isArray(teamData?.members);
  const countLabel = (value: number) => countsAvailable ? value : loading ? 'Loading…' : 'Unavailable';
  const currentUser = countsAvailable ? teamData?.currentUser ?? null : null;
  const canManageTeam = currentUser?.canManageTeam === true;
  const isAccountOwner = currentUser?.isAccountOwner === true;
  const currentUserRole = currentUser?.role ?? null;
  const allMembers = useMemo(() => forceEmpty ? [] : (teamData?.members ?? []).filter((member) => member.invite_status !== 'revoked'), [forceEmpty, teamData?.members]);
  const activeMembers = allMembers.filter((member) => member.invite_status === 'active');
  const pendingMembers = allMembers.filter((member) => member.invite_status === 'pending');
  const ownerCount = activeMembers.filter((member) => member.role === 'owner').length;
  const visibleMembers = allMembers.filter((member) => (!search || member.invited_email.toLowerCase().includes(search)) && (roleFilter === 'all' || uiRoleForMember(member.role) === roleFilter));

  async function loadTeam(preserveMessage = false) {
    if (!preserveMessage) dispatch({ type: 'patch', patch: { message: null } });
    reloadTeam();
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError(null);
    dispatch({ type: 'patch', patch: { submitting: true, message: null } });
    try {
      const response = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({ type: 'patch', patch: { email: '', role: 'analyst', message: { type: 'success', text: 'Invitation sent. They receive a magic link and join with the selected role.' } } });
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
      setTransferError(null);
      setTransferRequest({ member, idempotencyKey: crypto.randomUUID() });
      setTransferConfirmation('');
      return;
    }
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({ type: 'patch', patch: { message: { type: 'success', text: `${member.invited_email} is now ${ROLE_LABELS[nextRole]}.` } } });
      await loadTeam(true);
    } catch (error) {
      dispatch({ type: 'patch', patch: { message: { type: 'error', text: error instanceof Error ? error.message : 'Role update failed.' } } });
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
      const response = await fetch(`/api/team/${member.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ role: 'owner', confirmOwnershipTransfer: true }) });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setTransferRequest(null);
      setTransferConfirmation('');
      dispatch({ type: 'patch', patch: { message: { type: 'success', text: `Ownership transferred to ${member.invited_email}. Your role is now administrator.` } } });
      await loadTeam(true);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Ownership transfer failed.');
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  async function removeMember(member: TeamMember) {
    setRemovalError(null);
    dispatch({ type: 'patch', patch: { busyMemberId: member.id, message: null } });
    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      dispatch({ type: 'patch', patch: { message: { type: 'success', text: `${member.invited_email} was removed from the team.` } } });
      setRemovalTarget(null);
      await loadTeam(true);
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : 'Remove failed.');
    } finally {
      dispatch({ type: 'patch', patch: { busyMemberId: null } });
    }
  }

  const toolbar = <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
    <span style={{ paddingRight: 18, color: '#1c1f23', font: "400 17px/1 'IBM Plex Mono',monospace" }}>{countLabel(activeMembers.length)}</span><span style={{ paddingRight: 18, borderRight: '1px solid #e4e3e0', color: '#64686d', font: "400 12px/1.3 'Inter',sans-serif" }}>active seat{activeMembers.length === 1 ? '' : 's'}</span>
    <span style={{ padding: '0 18px', borderRight: '1px solid #e4e3e0', color: pendingMembers.length ? '#8f4b2b' : '#64686d', font: "400 12px/1.3 'Inter',sans-serif" }}><b style={{ marginRight: 7, font: "400 17px/1 'IBM Plex Mono',monospace" }}>{countLabel(pendingMembers.length)}</b> invite{pendingMembers.length === 1 ? '' : 's'} pending</span>
    <span style={{ padding: '0 18px', color: !countsAvailable ? '#64686d' : ownerCount === 1 ? '#7a5310' : '#b0431a', font: "400 12px/1.3 'Inter',sans-serif" }}><b style={{ marginRight: 7, font: "400 17px/1 'IBM Plex Mono',monospace" }}>{countLabel(ownerCount)}</b> owner{countsAvailable && ownerCount === 1 ? '' : 's'}</span>
    <span style={{ flex: 1 }}/>
    <button type="button" disabled title="Workspace-wide 2FA enforcement is not exposed by the current provider contract" style={buttonStyle('quiet', true)}>Require 2FA for everyone</button>
    <button type="button" aria-label="Invite member" disabled={loading || !canManageTeam} onClick={() => { setInviteError(null); setInviteOpen(true); }} style={buttonStyle('primary', loading || !canManageTeam)}>Invite someone</button>
  </div>;

  if (teamError && !teamData) {
    return <section data-screen-label="Team" data-visual-world="supplied-package" data-surface-id="team-management" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <SetBreadcrumbLabel label="Team" detail={countsAvailable ? `${activeMembers.length} active members · ${pendingMembers.length} pending invites · ${ownerCount} owners` : loading ? "Loading team registry…" : "Team registry unavailable"} /><h1 className="sr-only">Team</h1>{toolbar}
      <div role="alert" style={{ margin: 22, padding: 24, borderRadius: 12, background: '#fdf0e6', color: '#b0431a' }} data-state-id="team-error"><strong>Team registry unavailable</strong><p>{teamError} No member counts or rows are shown because the workspace team could not be verified.</p><button type="button" onClick={reloadTeam} style={buttonStyle()}>Try again</button></div>
    </section>;
  }

  return <section data-screen-label="Team" data-visual-world="supplied-package" data-surface-id="team-management" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', color: '#1c1f23' }}>
    <SetBreadcrumbLabel label="Team" detail={countsAvailable ? `${activeMembers.length} active members · ${pendingMembers.length} pending invites · ${ownerCount} owners` : loading ? "Loading team registry…" : "Team registry unavailable"} /><h1 className="sr-only">Team</h1>
    {toolbar}
    {message ? <output style={{ flex: 'none', padding: '8px 22px', borderBottom: '1px solid #eae8e5', background: message.type === 'success' ? '#eef6f1' : '#fdf0e6', color: message.type === 'success' ? '#1a6b43' : '#b0431a', font: "400 11px/1.4 'Inter',sans-serif" }}>{message.text}</output> : null}
    <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <section style={{ flex: '0 0 316px', minHeight: 0, overflow: 'hidden', borderRadius: 10, padding: '6px 16px 8px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
          <div style={{ height: 30, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eae8e5' }}><h2 style={{ margin: 0, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>PEOPLE</h2><span style={{ flex: 1 }}/><span style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}>{search || roleFilter !== 'all' ? `${visibleMembers.length} matching members` : 'changing a role takes effect on their next action'}</span></div>
          <div style={{ height: 'calc(100% - 30px)', overflowY: 'auto' }} data-state-id={forceEmpty ? 'team-empty' : undefined}>
            {loading ? <div role="status" style={{ padding: 24, color: '#64686d' }}>Loading workspace members…</div> : visibleMembers.length === 0 ? <div style={{ padding: 24, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{search || roleFilter !== 'all' ? 'No members match these route filters.' : 'No team members yet. Invite a workspace member with the least privilege their work requires.'}</div> : visibleMembers.map((member) => {
              const isOwnerRow = member.is_account_owner === true;
              const isSelf = member.user_id != null && member.user_id === currentUser?.id;
              const canChange = canManageTeam && !isOwnerRow && !isSelf && (isAccountOwner || (currentUserRole === 'admin' && (member.role === 'analyst' || member.role === 'viewer')));
              const removable = canManageTeam && !isOwnerRow && !isSelf && member.role !== 'owner' && (isAccountOwner || (currentUserRole === 'admin' && (member.role === 'analyst' || member.role === 'viewer')));
              const pending = member.invite_status === 'pending';
              return <div key={member.id} style={{ minHeight: 43, display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) 150px 130px 78px 26px', alignItems: 'center', gap: 10, borderBottom: '1px solid #f4f2ef' }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" style={{ width: 20, height: 20, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#f4f2ef', color: '#64686d', font: "500 8px/1 'IBM Plex Mono',monospace" }}>{initials(member.invited_email)}</span><span style={{ minWidth: 0 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', textTransform: 'capitalize', font: "500 12px/1.25 'Inter',sans-serif" }}>{personLabel(member)}</span><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: "400 9.5px/1.3 'IBM Plex Mono',monospace" }}>{member.invited_email}</span></span></div>
                {canChange ? <select aria-label={`Role for ${member.invited_email}`} value={uiRoleForMember(member.role)} disabled={busyMemberId === member.id} onChange={(event) => void changeRole(member, event.target.value as TeamRole)} style={{ ...fieldStyle, width: 138 }}>
                  {UI_ASSIGNABLE_ROLES.filter((value) => currentUserRole !== 'admin' ? value !== 'owner' || member.invite_status === 'active' : value === 'analyst' || value === 'viewer').map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
                </select> : <span style={{ color: '#64686d', font: "400 11.5px/1.3 'Inter',sans-serif" }}>{ROLE_LABELS[member.role]}</span>}
                <span title={formatTeamJoinState(member)} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: "400 9.5px/1.3 'IBM Plex Mono',monospace" }}>{isSelf ? 'now · you' : formatTeamJoinState(member)}</span>
                <span style={{ justifySelf: 'start', borderRadius: 6, padding: '3px 7px', background: pending ? '#f4f2ef' : '#eef6f1', color: pending ? '#64686d' : '#1a6b43', font: "500 9px/1 'Inter',sans-serif" }}>{pending ? 'PENDING' : 'ACTIVE'}</span>
                {removable ? <button type="button" aria-label={`${pending ? 'Withdraw invitation for' : 'Remove'} ${member.invited_email}`} onClick={() => { setRemovalError(null); setRemovalTarget(member); }} style={{ width: 24, height: 24, border: 0, borderRadius: 6, background: 'transparent', color: '#64686d', cursor: 'pointer', font: "600 14px/1 'Inter',sans-serif" }}>⋮</button> : <span/>}
              </div>;
            })}
          </div>
        </section>
        <RoleMatrix/>
      </div>

      <aside style={{ width: 300, flex: '0 0 300px', minHeight: 0, borderRadius: 13, padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden', background: '#f4f3f1' }}>
        <h2 style={{ margin: '3px 2px 0', color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>NEEDS ATTENTION</h2>
        <div style={{ borderRadius: 10, padding: 13, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.06)' }}>
          <div style={{ display: 'flex', gap: 8 }}><strong style={{ flex: 1, color: '#1c1f23', font: "500 12px/1.35 'Inter',sans-serif" }}>Two-factor coverage is unavailable</strong><span style={{ borderRadius: 5, padding: '3px 6px', background: '#fdf0e6', color: '#8f4b2b', font: "500 8.5px/1 'Inter',sans-serif" }}>VERIFY</span></div>
          <p style={{ margin: '7px 0 0', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>The current team API does not expose each member&apos;s factor state, so this page does not infer who has 2FA.</p>
        </div>
        {pendingMembers.slice(0, 2).map((member) => <div key={member.id} style={{ borderRadius: 10, padding: 13, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.06)' }}><strong style={{ color: '#1c1f23', font: "500 12px/1.35 'Inter',sans-serif" }}>{member.invited_email}</strong><p style={{ margin: '6px 0 0', color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>Invitation pending · role {ROLE_LABELS[member.role]}</p></div>)}
        <h2 style={{ margin: '3px 2px 0', color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHY THESE FOUR ROLES</h2>
        <div style={{ borderRadius: 10, padding: '4px 13px', background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.06)' }}>
          {[['Owner', 'Closes periods and decides who gets in. One person, on purpose.'], ['Admin', 'Changes how the desk behaves — rules, flows, sources.'], ['Analyst', 'Works the queue all day. Decides cases within the workspace limit.'], ['Viewer', 'Reads everything, changes nothing.']].map(([label, copy], index) => <div key={label} style={{ padding: '10px 0', borderBottom: index === 3 ? 0 : '1px solid #eae8e5' }}><strong style={{ display: 'block', color: '#1c1f23', font: "500 11.5px/1.3 'Inter',sans-serif" }}>{label}</strong><span style={{ display: 'block', marginTop: 3, color: '#64686d', font: "400 10px/1.4 'Inter',sans-serif" }}>{copy}</span></div>)}
        </div>
        <span style={{ flex: 1 }}/>
        <p style={{ margin: 0, padding: '10px 2px 0', borderTop: '1px solid #ddd8d1', color: '#64686d', font: "400 10px/1.45 'Inter',sans-serif" }}>Every role change is written to the audit log with who made it.</p>
      </aside>
    </div>

    <ModalCanvas open={inviteOpen} title="Invite team member" description="They receive an email with a magic link to join this workspace." overlayId="invite-member-and-transfer-ownership-modals" busy={submitting} onClose={() => { setInviteOpen(false); setInviteError(null); }} footer={<><button type="button" disabled={submitting} onClick={() => setInviteOpen(false)} style={buttonStyle('quiet', submitting)}>Cancel</button><button type="submit" form="team-invite-form" disabled={submitting} style={buttonStyle('primary', submitting)}>{submitting ? 'Sending…' : 'Send invitation'}</button></>}>
      <form onSubmit={inviteMember} style={{ padding: 0 }} id="team-invite-form">
        <label htmlFor="team-invite-email" style={{ display: 'block', color: '#1c1f23', font: "500 11px/1.4 'Inter',sans-serif" }}>Email address</label>
        <input id="team-invite-email" type="email" required autoComplete="off" value={email} onChange={(event) => dispatch({ type: 'patch', patch: { email: event.target.value } })} placeholder="name@company.com" style={{ ...fieldStyle, width: '100%', marginTop: 7 }}/>
        <label htmlFor="team-invite-role" style={{ display: 'block', marginTop: 16, color: '#1c1f23', font: "500 11px/1.4 'Inter',sans-serif" }}>Assigned role</label>
        <select id="team-invite-role" value={role} onChange={(event) => dispatch({ type: 'patch', patch: { role: event.target.value as typeof role } })} style={{ ...fieldStyle, width: '100%', marginTop: 7 }}>
          {INVITE_ROLES.filter((option) => currentUserRole === 'owner' || option.value !== 'admin').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <p style={{ margin: '7px 0 0', color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{INVITE_ROLES.find((option) => option.value === role)?.help} Ownership is transferred separately and cannot be invited.</p>
        {inviteError ? <p role="alert" style={{ borderRadius: 8, padding: '9px 12px', background: '#fdf0e6', color: '#b0431a', font: "400 11px/1.4 'Inter',sans-serif" }}>{inviteError}</p> : null}

      </form>
    </ModalCanvas>

    <ModalCanvas open={transferRequest != null} title="Transfer workspace ownership?" description="This changes who controls ownership, billing, access, and future transfers." overlayId="invite-member-and-transfer-ownership-modals" busy={Boolean(transferRequest && busyMemberId === transferRequest.member.id)} onClose={() => { setTransferRequest(null); setTransferConfirmation(''); setTransferError(null); }} footer={transferRequest ? <><button type="button" disabled={busyMemberId === transferRequest.member.id} onClick={() => setTransferRequest(null)} style={buttonStyle()}>Cancel</button><button type="button" disabled={transferConfirmation !== 'TRANSFER' || busyMemberId === transferRequest.member.id} onClick={() => void transferOwnership()} style={buttonStyle('danger', transferConfirmation !== 'TRANSFER' || busyMemberId === transferRequest.member.id)}>{busyMemberId === transferRequest.member.id ? 'Transferring…' : 'Transfer ownership'}</button></> : null}>
      {transferRequest ? <div style={{ padding: 0 }}>
        <p style={{ margin: 0, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}><strong style={{ color: '#1c1f23' }}>{transferRequest.member.invited_email}</strong> will become the only workspace owner. Your account will remain an administrator.</p>
        <div style={{ marginTop: 16, borderRadius: 10, padding: 13, background: '#f4f3f1', color: '#40454a', font: "400 11px/1.45 'Inter',sans-serif" }}>The transfer and both resulting roles are appended to workspace history. There is no automatic rollback.</div>
        <label htmlFor="team-transfer-confirmation" style={{ display: 'block', marginTop: 16, color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>Type <strong>TRANSFER</strong> to confirm</label>
        <input ref={transferConfirmationRef} id="team-transfer-confirmation" value={transferConfirmation} onChange={(event) => setTransferConfirmation(event.target.value)} autoComplete="off" style={{ ...fieldStyle, width: '100%', marginTop: 7 }}/>
        {transferError ? <p role="alert" style={{ borderRadius: 8, padding: '9px 12px', background: '#fdf0e6', color: '#b0431a' }}>{transferError}</p> : null}

      </div> : null}
    </ModalCanvas>

    <ModalCanvas open={removalTarget != null} title={removalTarget?.invite_status === 'pending' ? 'Revoke this invitation?' : 'Remove workspace access?'} description="This is an immediate access change and will be recorded in the audit trail." overlayId="remove-team-member" busy={Boolean(removalTarget && busyMemberId === removalTarget.id)} onClose={() => { setRemovalTarget(null); setRemovalError(null); }} footer={removalTarget ? <><button type="button" disabled={busyMemberId === removalTarget.id} onClick={() => setRemovalTarget(null)} style={buttonStyle()}>Go back</button><button type="button" disabled={busyMemberId === removalTarget.id} onClick={() => void removeMember(removalTarget)} style={buttonStyle('danger', busyMemberId === removalTarget.id)}>{busyMemberId === removalTarget.id ? 'Removing…' : removalTarget.invite_status === 'pending' ? 'Revoke invitation' : 'Remove access'}</button></> : null}>
      {removalTarget ? <div style={{ padding: 0 }}><p style={{ margin: 0, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}><strong style={{ color: '#1c1f23' }}>{removalTarget.invited_email}</strong> will no longer be able to access this workspace. Existing records and attributed audit events remain unchanged.</p>{removalError ? <p role="alert" style={{ borderRadius: 8, padding: '9px 12px', background: '#fdf0e6', color: '#b0431a' }}>{removalError}</p> : null}</div> : null}
    </ModalCanvas>
  </section>;
}
