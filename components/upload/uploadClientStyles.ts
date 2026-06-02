import type { CSSProperties } from 'react';

export const uploadTextStyle: CSSProperties = { color: 'var(--text)' };
export const uploadMutedTextStyle: CSSProperties = { color: 'var(--text-muted)' };
export const uploadSubtleTextStyle: CSSProperties = { color: 'var(--text-subtle)' };
export const uploadAccentTextStyle: CSSProperties = { color: 'var(--accent)' };
export const uploadIconMutedStyle: CSSProperties = { color: 'var(--icon-muted)' };
export const uploadSuccessIconStyle: CSSProperties = { color: 'var(--success)' };
export const uploadCriticalIconStyle: CSSProperties = { color: 'var(--risk-critical)' };
export const uploadHighRiskIconStyle: CSSProperties = { color: 'var(--risk-high)' };

export const uploadSubtleBorderStyle: CSSProperties = { borderColor: 'var(--border-subtle)' };

export const uploadSurfaceCardStyle: CSSProperties = {
  borderColor: 'var(--border-subtle)',
  background: 'var(--bg-surface)',
};

export const uploadInsetFieldStyle: CSSProperties = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
};

export const uploadPrimaryButtonStyle: CSSProperties = {
  background: 'var(--accent)',
  color: 'var(--text-inverse)',
};

export const uploadSecondaryButtonStyle: CSSProperties = {
  borderColor: 'var(--border)',
  color: 'var(--text)',
};

export const uploadSuccessPanelStyle: CSSProperties = {
  background: 'var(--success-bg)',
  borderColor: 'var(--success-bd)',
};

export const uploadHighRiskPanelStyle: CSSProperties = {
  background: 'var(--risk-high-bg)',
  borderColor: 'var(--risk-high-bd)',
};

export const uploadCriticalPanelStyle: CSSProperties = {
  background: 'var(--risk-critical-bg)',
  borderColor: 'var(--risk-critical-bd)',
};

export const uploadMediumRiskPanelStyle: CSSProperties = {
  background: 'var(--risk-medium-bg)',
  borderColor: 'var(--risk-medium-bd)',
};

export const uploadInfoChipStyle: CSSProperties = {
  background: 'var(--info-bg)',
  color: 'var(--info)',
};

export const uploadProgressTrackStyle: CSSProperties = { background: 'var(--bg-muted)' };

export const uploadProgressFillStyle = (percent: number): CSSProperties => ({
  width: `${percent}%`,
  background: 'var(--accent)',
});

export const uploadPulseProgressStyle: CSSProperties = {
  background: 'var(--accent)',
  opacity: 0.6,
};

export const uploadDropzoneStyle = (dragOver: boolean, isProcessing: boolean): CSSProperties => ({
  cursor: isProcessing ? 'default' : 'pointer',
  opacity: isProcessing ? 0.6 : 1,
  borderColor: dragOver ? 'var(--copper-bright)' : 'var(--surface-border)',
  background: dragOver ? 'var(--copper-glow)' : 'var(--surface-raised)',
});

export const uploadStepBarStyle = (index: number, stepIndex: number): CSSProperties => ({
  background:
    index < stepIndex ? 'var(--copper-bright)' : index === stepIndex ? 'var(--copper-dim)' : 'var(--surface-muted)',
});

export const uploadStepLabelStyle = (index: number, stepIndex: number): CSSProperties => ({
  color: index <= stepIndex ? 'var(--ink-secondary)' : 'var(--ink-tertiary)',
});

export function uploadMappedRowStyle(isUnmapped: boolean, isImprover = false): CSSProperties {
  if (isUnmapped && isImprover) {
    return {
      background: 'var(--risk-medium-bg)',
      border: '1px solid var(--risk-medium-bd)',
    };
  }
  if (isUnmapped) {
    return {
      background: 'var(--risk-critical-bg)',
      border: '1px solid var(--risk-critical-bd)',
    };
  }
  return {
    background: 'var(--bg-subtle)',
    border: '1px solid transparent',
  };
}

export function uploadUploadTypeOptionStyle(selected: boolean): CSSProperties {
  return {
    borderColor: selected ? 'var(--accent)' : 'var(--border)',
    background: selected ? 'var(--accent-subtle, var(--bg-subtle))' : 'var(--bg-subtle)',
  };
}

export function batchStatusColor(status: string): string {
  if (status === 'complete') return 'var(--success)';
  if (status === 'error') return 'var(--risk-critical)';
  if (status === 'processing' || status === 'uploading') return 'var(--accent)';
  return 'var(--text-muted)';
}

