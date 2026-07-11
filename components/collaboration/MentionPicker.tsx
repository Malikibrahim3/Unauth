'use client';

export type MentionMember = { user_id: string | null; invited_email: string; invite_status: string };

export function MentionPicker({ members, selected, onChange }: {
  members: MentionMember[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const active = members.filter((member) => member.user_id && member.invite_status === 'active');
  if (!active.length) return null;
  return <fieldset>
    <legend className="mb-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>Mention teammates</legend>
    <div className="flex flex-wrap gap-2">
      {active.map((member) => <label key={member.user_id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
        <input type="checkbox" checked={selected.includes(member.user_id!)} onChange={(event) => onChange(event.target.checked ? [...selected, member.user_id!] : selected.filter((id) => id !== member.user_id))} />
        {member.invited_email}
      </label>)}
    </div>
  </fieldset>;
}
