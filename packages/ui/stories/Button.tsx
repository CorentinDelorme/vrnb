export interface ButtonProps {
  /** Is this the principal call to action on the page? */
  primary?: boolean;
  /** How large should the button be? */
  size?: 'small' | 'medium' | 'large';
  /** Button contents */
  label: string;
  /** Optional click handler */
  onClick?: () => void;
}

/** Primary UI component for user interaction */
export const Button = ({
  primary = false,
  size = 'medium',
  label,
  ...props
}: ButtonProps) => {
  const mode = primary ? 'btn-primary' : 'btn-outline';
  const sizeClass =
    size === 'small' ? 'btn-sm' : size === 'large' ? 'btn-lg' : 'btn-md';

  return (
    <button
      type="button"
      className={['btn', 'font-sans', sizeClass, mode].join(' ')}
      {...props}
    >
      {label}
    </button>
  );
};
