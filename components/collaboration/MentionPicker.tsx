'use client';

import { Checkbox } from '@/components/ui';

export type MentionMember = { user_id: string | null; invited_email: string; invite_status: string };

export function MentionPicker({ members, selected, onChange }: {
  members: MentionMember[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const active = members.filter((member) => member.user_id && member.invite_status === 'active');
  if (!active.length) return null;
  return <fieldset>
    <legend className="text-[10.5px] leading-4 text-[#6f6a63] mb-1" style={{ color: '#6f6a63' }}>Mention teammates</legend>
    <div className="flex flex-wrap gap-2">
      {active.map((member) => <label key={member.user_id} className="text-[10.5px] leading-4 text-[#6f6a63] flex items-center gap-1 rounded-md border px-2 py-1">
        <Checkbox checked={selected.includes(member.user_id!)} onChange={(event) => onChange(event.target.checked ? [...selected, member.user_id!] : selected.filter((id) => id !== member.user_id))} />
        {member.invited_email}
      </label>)}
    </div>
  </fieldset>;
}
