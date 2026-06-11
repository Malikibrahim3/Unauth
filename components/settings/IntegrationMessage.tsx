import React from 'react';

type IntegrationMessageVariant = 'success' | 'warning' | 'error';

interface IntegrationMessageProps {
  variant: IntegrationMessageVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<IntegrationMessageVariant, React.CSSProperties> = {
  success: {
    backgroundColor: 'var(--success-bg)',
    borderColor: 'var(--success-bd)',
    color: 'var(--success)',
  },
  warning: {
    backgroundColor: 'var(--warning-bg)',
    borderColor: 'var(--warning-bd)',
    color: 'var(--warning)',
  },
  error: {
    backgroundColor: 'var(--sev-definite-fill)',
    borderColor: 'var(--success)',
    color: 'var(--success)',
  },
};

export function IntegrationMessage({
  variant,
  children,
  className,
}: IntegrationMessageProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={className}
      style={{
        ...styles,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderLeftWidth: '3px',
        borderRadius: '6px',
        padding: '10px 14px',
      }}
    >
      <span className="text-small">{children}</span>
    </div>
  );
}
