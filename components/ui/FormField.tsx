'use client';

import { cloneElement, forwardRef, useId, type CSSProperties, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from 'react';

type Control = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; style?: CSSProperties };

const controlStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  border: '1px solid #d8d4cf',
  borderRadius: 8,
  background: '#fff',
  padding: '8px 12px',
  color: '#1c1f23',
  font: "400 12px/1.5 'Inter', sans-serif",
};

export function FormField({ label, hint, error, optional = false, success, children, className: _className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; optional?: boolean; success?: ReactNode; children: ReactElement<Control>; className?: string }) {
  const seed = useId().replaceAll(':', '');
  const id = children.props.id ?? `field-${seed}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const successId = success ? `${id}-success` : undefined;
  const describedBy = [children.props['aria-describedby'], hintId, errorId, successId].filter(Boolean).join(' ');
  return <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 6 }} data-invalid={error ? 'true' : undefined}>
    <label style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, color: '#40454a', fontSize: 11, fontWeight: 500, lineHeight: 1.45 }} htmlFor={id}><span>{label}</span>{optional ? <span style={{ color: '#6f6a63', fontWeight: 400 }}>Optional</span> : null}</label>
    {cloneElement(children, { id, 'aria-describedby': describedBy || undefined, 'aria-invalid': error ? true : undefined, style: { ...controlStyle, ...children.props.style } })}
    {hint ? <p id={hintId} style={{ margin: 0, color: '#6f6a63', fontSize: 10.5, lineHeight: 1.45 }}>{hint}</p> : null}
    {error ? <p id={errorId} style={{ margin: 0, color: '#b0431a', fontSize: 10.5, lineHeight: 1.45 }} role="alert">{error}</p> : null}
    {success ? <p id={successId} style={{ margin: 0, color: '#1a6b43', fontSize: 10.5, lineHeight: 1.45 }} role="status">{success}</p> : null}
  </div>;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className: _className, style, disabled, ...props }, ref) {
  return <textarea ref={ref} disabled={disabled} style={{ ...controlStyle, minHeight: 96, resize: 'vertical', background: disabled ? '#f4f3f1' : '#fff', ...style }} {...props} />;
});

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(function Checkbox({ className: _className, style, ...props }, ref) {
  return <input ref={ref} type="checkbox" style={{ width: 16, height: 16, accentColor: '#1c1f23', ...style }} {...props} />;
});

export function Switch({ label, description, className: _className, style, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; description?: ReactNode }) {
  return <label style={{ display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', gap: 20, borderTop: '1px solid #e4e3e0', padding: '12px 0', ...style }}>
    <span style={{ minWidth: 0 }}><strong style={{ display: 'block', color: '#1c1f23', fontSize: 12, fontWeight: 500 }}>{label}</strong>{description ? <span style={{ display: 'block', marginTop: 2, color: '#64686d', fontSize: 10.5, lineHeight: 1.45 }}>{description}</span> : null}</span>
    <input type="checkbox" role="switch" style={{ width: 36, height: 20, flexShrink: 0, accentColor: '#1c1f23' }} {...props} />
  </label>;
}

export function RadioGroup({ legend, children, className: _className }: { legend: ReactNode; children: ReactNode; className?: string }) {
  return <fieldset style={{ minWidth: 0, margin: 0, border: 0, padding: 0 }}><legend style={{ marginBottom: 8, color: '#40454a', fontSize: 11, fontWeight: 500 }}>{legend}</legend><div style={{ display: 'grid', gap: 8 }}>{children}</div></fieldset>;
}
