// ─────────────────────────────────────────────────────────────────────────────
// GlassCard Component — V16.4 Glassmorphic Design System
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  variant?: 'default' | 'teal' | 'gold' | 'red' | 'green';
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const variantStyles = {
  default: 'border-[rgba(255,255,255,0.11)]',
  teal: 'border-[rgba(14,124,123,0.38)] shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_30px_rgba(14,124,123,0.1)] [box-shadow:0_8px_28px_rgba(0,0,0,0.45),0_0_30px_rgba(14,124,123,0.1),inset_0_1px_0_rgba(14,200,198,0.28)]',
  gold: 'border-[rgba(201,168,76,0.35)] shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_28px_rgba(201,168,76,0.1)] [box-shadow:0_8px_28px_rgba(0,0,0,0.45),0_0_28px_rgba(201,168,76,0.1),inset_0_1px_0_rgba(255,210,100,0.22)]',
  red: 'border-[rgba(220,75,55,0.38)] shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(220,75,55,0.12)] [box-shadow:0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(220,75,55,0.12),inset_0_1px_0_rgba(220,120,100,0.22)]',
  green: 'border-[rgba(30,165,80,0.35)] shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(30,165,80,0.1)] [box-shadow:0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(30,165,80,0.1),inset_0_1px_0_rgba(80,200,120,0.22)]',
};

export default function GlassCard({
  children,
  variant = 'default',
  className = '',
  onClick,
  hover = true,
}: GlassCardProps) {
  const baseStyles = 'card-glass relative overflow-hidden';
  const variantStyle = variantStyles[variant];
  const hoverStyle = hover && onClick ? 'cursor-pointer transition-all duration-200' : '';
  
  return (
    <div
      className={`${baseStyles} ${variantStyle} ${hoverStyle} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}
