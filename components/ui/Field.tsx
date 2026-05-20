import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, helper, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className="text-caption font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--accent)', marginLeft: 3 }}>*</span>
        )}
      </label>
      {children}
      {(helper || error) && (
        <p
          className="text-caption"
          style={{ color: error ? 'var(--risk-critical-fg)' : 'var(--text-subtle)' }}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

type FieldInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function FieldInput({ error, className, style, ...props }: FieldInputProps) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 text-sm focus:outline-none transition-colors',
        className,
      )}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${error ? 'var(--risk-critical-bd)' : 'var(--border-default)'}`,
        borderRadius: 6,
        color: 'var(--text)',
        height: 32,
        ...style,
      }}
      {...props}
    />
  );
}

type FieldSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export function FieldSelect({ error, className, style, children, ...props }: FieldSelectProps) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2 text-sm focus:outline-none transition-colors',
        className,
      )}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${error ? 'var(--risk-critical-bd)' : 'var(--border-default)'}`,
        borderRadius: 6,
        color: 'var(--text)',
        height: 32,
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

type FieldTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export function FieldTextarea({ error, className, style, ...props }: FieldTextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2 text-sm focus:outline-none transition-colors resize-y',
        className,
      )}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${error ? 'var(--risk-critical-bd)' : 'var(--border-default)'}`,
        borderRadius: 6,
        color: 'var(--text)',
        minHeight: 80,
        ...style,
      }}
      {...props}
    />
  );
}
