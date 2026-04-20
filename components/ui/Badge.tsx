// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Badge Component
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal' | 'navy';

interface BadgeProps {
  children:  React.ReactNode;
  variant?:  BadgeVariant;
  dot?:      boolean;
  className?: string;
}

const STYLES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100   text-red-800',
  info:    'bg-blue-100  text-blue-800',
  neutral: 'bg-lgray     text-slate-600',
  teal:    'bg-teal/10   text-teal',
  navy:    'bg-navy       text-white',
};

const DOT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  neutral: 'bg-slate-400',
  teal:    'bg-teal',
  navy:    'bg-white',
};

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        STYLES[variant],
        className,
      ].filter(Boolean).join(' ')}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_STYLES[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
