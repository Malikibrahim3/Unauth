'use client';

import {
  cloneElement,
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type FieldControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  className?: string;
};

export function FormField({
  label,
  hint,
  error,
  optional = false,
  success,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  success?: ReactNode;
  children: ReactElement<FieldControlProps>;
  className?: string;
}) {
  const generatedId = useId().replaceAll(':', '');
  const controlId = children.props.id ?? 'field-' + generatedId;
  const hintId = hint ? controlId + '-hint' : undefined;
  const errorId = error ? controlId + '-error' : undefined;
  const successId = success ? controlId + '-success' : undefined;
  const describedBy = [
    children.props['aria-describedby'],
    hintId,
    errorId,
    successId,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cn('ua-form-field', className)}
      data-invalid={error ? true : undefined}
      data-success={success ? true : undefined}
    >
      <label className="ua-form-field__label" htmlFor={controlId}>
        <span>{label}</span>
        {optional ? <span className="ua-form-field__optional">Optional</span> : null}
      </label>
      {cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        className: cn('ua-form-control', children.props.className),
      })}
      {hint ? (
        <p className="ua-form-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="ua-form-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="ua-form-field__success" id={successId} role="status">
          <Check aria-hidden="true" />
          {success}
        </p>
      ) : null}
    </div>
  );
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('ua-textarea', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" className={cn('ua-checkbox', className)} {...props} />
));
Checkbox.displayName = 'Checkbox';

export function Switch({
  label,
  description,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className={cn('ua-switch-row', className)}>
      <span className="ua-switch-row__copy">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <span className="ua-switch">
        <input
          type="checkbox"
          role="switch"
          aria-checked={props['aria-checked'] ?? Boolean(props.checked ?? props.defaultChecked)}
          {...props}
        />
        <span className="ua-switch__track" aria-hidden="true">
          <span className="ua-switch__thumb" />
        </span>
      </span>
    </label>
  );
}

export function RadioGroup({
  legend,
  children,
  className,
}: {
  legend: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('ua-radio-group', className)}>
      <legend>{legend}</legend>
      <div className="ua-radio-group__options">{children}</div>
    </fieldset>
  );
}
