import type { HTMLAttributes, ReactNode } from 'react';
import { Input, type InputProps } from '../Input/Input';

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Label text */
  label: string;
  /** Error message */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Input props forwarded to the Input component */
  inputProps?: Omit<InputProps, 'label' | 'error' | 'required'>;
  /** Optional custom input element (overrides inputProps) */
  children?: ReactNode;
}

/** Wrapper component combining label, input, and error message */
export function FormField({
  label,
  error,
  required,
  inputProps,
  children,
  className = '',
  ...props
}: FormFieldProps) {
  if (children) {
    const fieldId = label.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${fieldId}-error` : undefined;

    return (
      <div className={`form-control w-full ${className}`} {...props}>
        <label className="label" htmlFor={fieldId}>
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
        {children}
        {error && (
          <p id={errorId} className="label text-error text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      <Input label={label} error={error} required={required} {...inputProps} />
    </div>
  );
}
