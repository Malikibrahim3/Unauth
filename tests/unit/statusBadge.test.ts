import { statusTone, STATUS_TONES } from '@/components/ui/StatusBadge';
import { formatNumber } from '@/lib/utils/format';

describe('status tone system', () => {
  it('maps in-progress, waiting, positive and negative states to distinct tones', () => {
    expect(statusTone('ready_for_decision')).toBe('info');
    expect(statusTone('awaiting_carrier_response')).toBe('warning');
    expect(statusTone('chase_due')).toBe('warning');
    expect(statusTone('paid')).toBe('success');
    expect(statusTone('resolved_refunded')).toBe('success');
    expect(statusTone('escalated')).toBe('danger');
    expect(statusTone('resolved_denied')).toBe('danger');
    expect(statusTone('open')).toBe('neutral');
  });

  it('never lets a positive and a negative terminal share the warning tone', () => {
    expect(STATUS_TONES.resolved_refunded).toBe('success');
    expect(STATUS_TONES.resolved_denied).toBe('danger');
    expect(STATUS_TONES.resolved_refunded).not.toBe(STATUS_TONES.resolved_denied);
  });

  it('falls back to neutral for unknown values', () => {
    expect(statusTone('some_unmapped_state')).toBe('neutral');
    expect(statusTone(null)).toBe('neutral');
  });
});

describe('formatNumber', () => {
  it('renders deterministic thousands separators and a dash for missing', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});
