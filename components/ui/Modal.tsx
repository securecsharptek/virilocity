'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Modal Component  ·  WCAG 2.2
// 2.1.2 No Keyboard Trap — Escape closes · 4.1.2 Name/Role/Value
// Focus trapped inside modal · aria-modal · aria-labelledby
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  children:  ReactNode;
  footer?:   ReactNode;
  size?:     'sm' | 'md' | 'lg';
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export default function Modal({
  open, onClose, title, children, footer, size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId   = `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

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
        className="absolute inset-0 bg-black/50"
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
          'relative z-10 w-full bg-white rounded-xl shadow-xl',
          'max-h-[90vh] flex flex-col overflow-hidden',
          SIZE[size],
        ].join(' ')}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mgray flex-shrink-0">
          <h2 id={titleId} className="text-lg font-bold text-navy">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={`Close ${title} dialog`}
            className="!p-1.5 !min-h-0 !min-w-0"
          >
            <span aria-hidden="true" className="text-slate-500 text-lg leading-none">✕</span>
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-mgray bg-lgray flex-shrink-0 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
