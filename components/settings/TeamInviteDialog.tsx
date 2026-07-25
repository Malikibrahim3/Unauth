'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { INVITE_ROLES, type TeamRole } from '@/components/settings/teamManagementTypes';

type TeamInviteDialogProps = {
  open: boolean;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  submitting: boolean;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: Exclude<TeamRole, 'owner'>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

/**
 * Structured invite dialog (spec §6.2, §6.8, §7.8): labelled email field, role
 * chosen from selectable option tiles in a two-column grid, and a fixed footer
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
            className="text-[length:var(--ua-text-label-size)] font-medium leading-[var(--ua-text-label-leading)] text-[var(--ua-text-primary)]"
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
          <p className="text-[length:var(--ua-text-caption-size)] leading-[var(--ua-text-caption-leading)] text-[var(--ua-text-tertiary)]">
            Up to 50 invitations per hour.
          </p>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[length:var(--ua-text-label-size)] font-medium leading-[var(--ua-text-label-leading)] text-[var(--ua-text-primary)]">
            Role
          </legend>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Role">
            {INVITE_ROLES.map((option) => {
              const selected = option.value === role;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onRoleChange(option.value)}
                  className={cn('ua-option-tile', selected && 'is-selected')}
                >
                  <span>{option.label}</span>
                  <span className="ua-option-tile-description">{option.help}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
