// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Card Component
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';

interface CardProps {
  children:   ReactNode;
  title?:     string;
  subtitle?:  string;
  action?:    ReactNode;
  padded?:    boolean;
  className?: string;
  as?:        'div' | 'article' | 'section';
}

export default function Card({
  children, title, subtitle, action,
  padded = true, className = '', as: Tag = 'div',
}: CardProps) {
  const headerId = title ? `card-${title.toLowerCase().replace(/\s+/g, '-')}` : undefined;

  return (
    <Tag
      className={`bg-white rounded-xl border border-mgray shadow-sm ${className}`}
      aria-labelledby={headerId}
    >
      {(title || action) && (
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-mgray">
          <div>
            {title && (
              <h2 id={headerId} className="text-base font-bold text-navy">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0 ml-4">{action}</div>}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </Tag>
  );
}
