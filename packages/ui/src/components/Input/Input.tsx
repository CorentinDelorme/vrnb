import type { InputHTMLAttributes } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClassMap: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'input-sm',
  md: 'input-md',
  lg: 'input-lg',
};

/** Input component for forms */
export function Input({
  label,
  error,
  size = 'md',
  required,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="form-control w-full">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`input input-bordered ${sizeClassMap[size]} ${error ? 'input-error' : ''} ${className}`}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <p id={errorId} className="label text-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
