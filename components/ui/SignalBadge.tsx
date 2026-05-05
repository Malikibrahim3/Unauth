import { cn } from '@/lib/utils';
import { Badge, type BadgeTone } from './Badge';

export type SignalType =
  | 'shared_email'
  | 'shared_phone'
  | 'shared_address'
  | 'shared_card'
  | 'shared_account_id'
  | 'shared_ip'
  | 'shared_device'
  | 'refund_velocity'
  | 'chargeback_after_delivery'
  | 'item_not_received_repeat'
  | 'address_mismatch'
  | 'name_variant'
  | 'behavioral_anomaly';

export type SignalStrength = 'weak' | 'moderate' | 'strong';

interface SignalMeta {
  label: string;
  tone: BadgeTone;
}

export const SIGNAL_META: Record<SignalType, SignalMeta> = {
  shared_email:               { label: 'Shared email',          tone: 'info' },
  shared_phone:               { label: 'Shared phone',          tone: 'info' },
  shared_address:             { label: 'Shared address',        tone: 'info' },
  shared_card:                { label: 'Shared card',           tone: 'warning' },
  shared_account_id:          { label: 'Shared account',        tone: 'info' },
  shared_ip:                  { label: 'Shared IP',             tone: 'info' },
  shared_device:              { label: 'Shared device',         tone: 'warning' },
  refund_velocity:            { label: 'Refund velocity',       tone: 'danger' },
  chargeback_after_delivery:  { label: 'CB after delivery',     tone: 'critical' },
  item_not_received_repeat:   { label: 'INR repeat',            tone: 'danger' },
  address_mismatch:           { label: 'Address mismatch',      tone: 'warning' },
  name_variant:               { label: 'Name variant',          tone: 'info' },
  behavioral_anomaly:         { label: 'Behavioural anomaly',   tone: 'warning' },
};

interface SignalBadgeProps {
  signal: SignalType;
  strength?: SignalStrength;
  size?: 'sm' | 'md';
  className?: string;
}

function StrengthBars({ strength }: { strength: SignalStrength }) {
  const filled = strength === 'weak' ? 1 : strength === 'moderate' ? 2 : 3;
  return (
    <span className="inline-flex items-end gap-px ml-1" aria-label={`Strength: ${strength}`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={cn(
            'rounded-sm',
            n <= filled ? 'opacity-100' : 'opacity-25',
          )}
          style={{
            width: 3,
            height: n === 1 ? 6 : n === 2 ? 8 : 10,
            background: 'currentColor',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

export function SignalBadge({ signal, strength, size = 'md', className }: SignalBadgeProps) {
  const meta = SIGNAL_META[signal] ?? { label: signal, tone: 'info' as BadgeTone };

  return (
    <Badge tone={meta.tone} variant="subtle" size={size} className={cn('whitespace-nowrap', className)}>
      {meta.label}
      {strength && <StrengthBars strength={strength} />}
    </Badge>
  );
}
