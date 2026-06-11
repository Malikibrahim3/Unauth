import React from 'react';

export type IntegrationStatus =
  | 'connected'
  | 'attention'
  | 'error'
  | 'not-connected'
  | 'coming-soon';

const STATUS_DEFAULTS: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  attention: 'Attention',
  error: 'Error',
  'not-connected': 'Not Connected',
  'coming-soon': 'Coming Soon',
};

const STATUS_STYLES: Record<
  IntegrationStatus,
  { chip: React.CSSProperties; dot: React.CSSProperties }
> = {
  connected: {
    chip: {
      background: 'var(--success-bg)',
      color: 'var(--success)',
      borderColor: 'var(--success)',
      borderStyle: 'solid',
    },
    dot: { background: 'var(--success)' },
  },
  attention: {
    chip: {
      background: 'var(--warning-bg)',
      color: 'var(--warning)',
      borderColor: 'var(--warning)',
      borderStyle: 'solid',
    },
    dot: { background: 'var(--warning)' },
  },
  error: {
    chip: {
      background: 'var(--sev-definite-fill)',
      color: 'var(--success)',
      borderColor: 'var(--success)',
      borderStyle: 'solid',
    },
    dot: { background: 'var(--success)' },
  },
  'not-connected': {
    chip: {
      background: 'var(--surface)',
      color: 'var(--text-tertiary)',
      borderColor: 'var(--border)',
      borderStyle: 'solid',
    },
    dot: { background: 'var(--text-tertiary)' },
  },
  'coming-soon': {
    chip: {
      background: 'var(--surface)',
      color: 'var(--text-tertiary)',
      borderColor: 'var(--border-muted)',
      borderStyle: 'dashed',
    },
    dot: { background: 'var(--text-tertiary)' },
  },
};

interface IntegrationStatusChipProps {
  status: IntegrationStatus;
  label?: string;
}

export function IntegrationStatusChip({
  status,
  label,
}: IntegrationStatusChipProps) {
  const displayLabel = label ?? STATUS_DEFAULTS[status];
  const styles = STATUS_STYLES[status];

  return (
    <span
      className="text-meta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        paddingInline: '7px',
        paddingBlock: '3px',
        borderRadius: '999px',
        borderWidth: '1px',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...styles.chip,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
          ...styles.dot,
        }}
      />
      {displayLabel}
    </span>
  );
}
