import { cn } from '@/lib/utils';
import { signalCopy } from '@/lib/copy/signals';
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
  tone: BadgeTone;
}

export const SIGNAL_META: Record<SignalType, SignalMeta> = {
  shared_email:               { tone: 'info' },
  shared_phone:               { tone: 'info' },
  shared_address:             { tone: 'info' },
  shared_card:                { tone: 'warning' },
  shared_account_id:          { tone: 'info' },
  shared_ip:                  { tone: 'info' },
  shared_device:              { tone: 'warning' },
  refund_velocity:            { tone: 'danger' },
  chargeback_after_delivery:  { tone: 'critical' },
  item_not_received_repeat:   { tone: 'danger' },
  address_mismatch:           { tone: 'warning' },
  name_variant:               { tone: 'info' },
  behavioral_anomaly:         { tone: 'warning' },
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
  const meta = SIGNAL_META[signal] ?? { tone: 'info' as BadgeTone };
  const copy = signalCopy(signal);

  return (
    <Badge tone={meta.tone} variant="subtle" size={size} className={cn('whitespace-nowrap', className)}>
      {copy.badge ?? copy.short}
      {strength && <StrengthBars strength={strength} />}
    </Badge>
  );
}
