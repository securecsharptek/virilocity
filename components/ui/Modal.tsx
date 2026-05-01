'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Modal Component  ·  WCAG 2.2
// 2.1.2 No Keyboard Trap — Escape closes · 4.1.2 Name/Role/Value
// Focus trapped inside modal · aria-modal · aria-labelledby
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  children:  ReactNode;
  footer?:   ReactNode;
  size?:     'sm' | 'md' | 'lg';
  variant?:  'light' | 'dashboard';
  bodyClassName?: string;
  footerClassName?: string;
  dialogClassName?: string;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

const STYLE: Record<NonNullable<ModalProps['variant']>, {
  overlay: string;
  dialog: string;
  header: string;
  title: string;
  close: string;
  body: string;
  footer: string;
}> = {
  light: {
    overlay: 'bg-black/50',
    dialog: 'bg-white rounded-xl shadow-xl border border-mgray',
    header: 'border-b border-mgray',
    title: 'text-lg font-bold text-navy',
    close: 'text-slate-500 hover:text-slate-700',
    body: 'bg-white',
    footer: 'border-t border-mgray bg-lgray',
  },
  dashboard: {
    overlay: 'bg-[rgba(2,8,18,0.72)] backdrop-blur-[2px]',
    dialog: 'rounded-[14px] bg-[rgba(5,16,30,0.995)] border border-[rgba(14,124,123,0.35)] shadow-[0_18px_42px_rgba(0,0,0,0.58),0_0_28px_rgba(14,124,123,0.2)]',
    header: 'border-b border-[rgba(255,255,255,0.08)]',
    title: 'font-sans text-[24px] leading-none text-[rgba(230,245,255,0.94)]',
    close: 'text-[rgba(170,190,210,0.78)] hover:text-[rgba(220,236,248,0.96)]',
    body: 'bg-[rgba(5,16,30,0.995)]',
    footer: 'border-t border-[rgba(255,255,255,0.08)] bg-[rgba(3,11,22,0.995)]',
  },
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'light',
  bodyClassName,
  footerClassName,
  dialogClassName,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId   = `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const styles = STYLE[variant];

  // WCAG 2.1.1: close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus first focusable element on open
  useEffect(() => {
    if (open && dialogRef.current) {
      const focusable = dialogRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    // WCAG: backdrop click closes modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="false"
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 ${styles.overlay}`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog — WCAG 4.1.2: role="dialog" + aria-modal + aria-labelledby */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-10 w-full',
          'max-h-[90vh] flex flex-col overflow-hidden',
          styles.dialog,
          SIZE[size],
          dialogClassName ?? '',
        ].join(' ')}
        tabIndex={-1}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 flex-shrink-0 ${styles.header}`}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title} dialog`}
            className={`p-1.5 leading-none transition-colors ${styles.close}`}
          >
            <span aria-hidden="true" className="text-[28px] leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto px-6 py-5 ${styles.body} ${bodyClassName ?? ''}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 flex-shrink-0 flex justify-end gap-2 ${styles.footer} ${footerClassName ?? ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
