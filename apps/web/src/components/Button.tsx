import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-accent hover:bg-primary-hover border border-primary',
  secondary: 'bg-sheet text-ink border border-line-strong hover:bg-canvas',
  ghost: 'text-ink-muted hover:text-ink hover:bg-canvas border border-transparent',
  danger: 'bg-danger text-on-accent border border-danger hover:bg-danger/90',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...buttonProps }: ButtonProps) {
  return (
    <button
      type={type}
      className={
        'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium ' +
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
        `${VARIANT_CLASSES[variant]} ${className}`
      }
      {...buttonProps}
    />
  );
}
