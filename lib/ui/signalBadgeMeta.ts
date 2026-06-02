import type { BadgeTone } from '@/components/ui/Badge';

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
  shared_email: { tone: 'info' },
  shared_phone: { tone: 'info' },
  shared_address: { tone: 'info' },
  shared_card: { tone: 'warning' },
  shared_account_id: { tone: 'info' },
  shared_ip: { tone: 'info' },
  shared_device: { tone: 'warning' },
  refund_velocity: { tone: 'danger' },
  chargeback_after_delivery: { tone: 'critical' },
  item_not_received_repeat: { tone: 'danger' },
  address_mismatch: { tone: 'warning' },
  name_variant: { tone: 'info' },
  behavioral_anomaly: { tone: 'warning' },
};
