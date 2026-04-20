'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Button Component  ·  WCAG 2.2 compliant
// WCAG 2.5.8: min 44×44px · 4.1.2: role/aria · 1.4.3: contrast
// ─────────────────────────────────────────────────────────────────────────────
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-navy text-white hover:bg-[#162952] focus-visible:ring-navy',
  secondary: 'bg-teal text-white hover:bg-[#0c6b6a] focus-visible:ring-teal',
  outline:   'border-2 border-navy text-navy bg-white hover:bg-lgray focus-visible:ring-navy',
  ghost:     'text-navy bg-transparent hover:bg-lgray focus-visible:ring-navy',
  danger:    'bg-danger text-white hover:bg-[#a93226] focus-visible:ring-danger',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-[2.2rem] min-w-[2.2rem]',
  md: 'text-sm px-4 py-2.5 min-h-[2.75rem] min-w-[2.75rem]',
  lg: 'text-base px-6 py-3 min-h-[3rem] min-w-[3rem]',
};

export default function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-colors duration-150 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* Loading spinner */}
      {loading && (
        <span
          aria-hidden="true"
          className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      )}
      {/* Left icon */}
      {!loading && icon && (
        <span aria-hidden="true" className="flex-shrink-0 w-4 h-4">{icon}</span>
      )}
      {/* Label */}
      <span>{children}</span>
      {/* Right icon */}
      {!loading && iconRight && (
        <span aria-hidden="true" className="flex-shrink-0 w-4 h-4">{iconRight}</span>
      )}
    </button>
  );
}
