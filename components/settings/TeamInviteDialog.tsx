'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { INVITE_ROLES, type TeamRole } from '@/components/settings/teamManagementTypes';
import { Select } from '@/components/ui/Select';

type TeamInviteDialogProps = {
  open: boolean;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  submitting: boolean;
  error?: string | null;
  currentUserRole: TeamRole;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: Exclude<TeamRole, 'owner'>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

/**
 * Structured invite dialog (spec §6.2, §6.8, §7.8): labelled email field, role
 * shown as a fixed assignment, and a fixed footer
 * with one secondary and one primary action.
 *
 * The tiles list the roles the product actually assigns. Ownership is not an
 * invitable role — it moves through the explicit transfer flow — so it is not
 * offered here rather than being shown and disabled.
 */
export function TeamInviteDialog({
  open,
  email,
  role,
  submitting,
  error,
  currentUserRole,
  onEmailChange,
  onRoleChange,
  onSubmit,
  onClose,
}: TeamInviteDialogProps) {
  const formId = 'team-invite-form';

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Invite team member"
      description="They receive an email with a magic link to join this workspace."
      size="md"
      closeOnBackdrop={!submitting}
      closeOnEscape={!submitting}
      showCloseButton={!submitting}
      overlayId="invite-member"
      footer={
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={submitting}>
            Send invitation
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="team-invite-email"
            className="text-[length:var(--uo-route-text-label-size)] font-medium leading-[var(--uo-route-text-label-leading)] text-[var(--uo-route-text-primary)]"
          >
            Email address
          </label>
          <Input
            id="team-invite-email"
            type="email"
            value={email}
            required
            autoComplete="off"
            placeholder="name@company.com"
            onChange={(event) => onEmailChange(event.target.value)}
          />
          <p className="text-[length:var(--uo-route-text-caption-size)] leading-[var(--uo-route-text-caption-leading)] text-[var(--uo-route-text-tertiary)]">
            Up to 50 invitations per hour.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="team-invite-role" className="text-[length:var(--uo-route-text-label-size)] font-medium leading-[var(--uo-route-text-label-leading)] text-[var(--uo-route-text-primary)]">Assigned role</label>
          <Select
            id="team-invite-role"
            value={role}
            onChange={(event) => onRoleChange(event.target.value as Exclude<TeamRole, 'owner'>)}
          >
            {INVITE_ROLES.filter((option) => currentUserRole === 'owner' || option.value !== 'admin').map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <p className="ua-text-caption-role">{INVITE_ROLES.find((option) => option.value === role)?.help} Ownership is transferred separately and cannot be invited.</p>
        </div>
        {error ? (
          <p role="alert" className="rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-critical)]">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
