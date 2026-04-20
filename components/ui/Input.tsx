'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Input Component  ·  WCAG 2.2
// 1.3.5 Input Purpose · 3.3.1 Error Identification · 1.4.11 Non-text contrast
// ─────────────────────────────────────────────────────────────────────────────
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label:        string;
  hint?:        string;
  error?:       string;
  leftAddon?:   ReactNode;
  rightAddon?:  ReactNode;
  fullWidth?:   boolean;
}

export default function Input({
  label,
  hint,
  error,
  leftAddon,
  rightAddon,
  fullWidth = true,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId   = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hintId    = hint  ? `${inputId}-hint`  : undefined;
  const errorId   = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {/* WCAG 1.3.1: visible label linked via htmlFor */}
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {props.required && (
          <span className="ml-1 text-danger" aria-label="required">*</span>
        )}
      </label>

      <div className="relative flex items-center">
        {leftAddon && (
          <span
            aria-hidden="true"
            className="absolute left-3 flex items-center text-slate-400 pointer-events-none"
          >
            {leftAddon}
          </span>
        )}

        <input
          {...props}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          className={[
            'block rounded-lg border text-sm transition-colors',
            'min-h-[2.75rem] px-3 py-2.5',         // WCAG 2.5.8: 44px target
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            error
              ? 'border-danger focus:ring-danger text-danger'
              : 'border-mgray focus:ring-teal focus:border-teal',
            leftAddon  ? 'pl-10'  : '',
            rightAddon ? 'pr-10' : '',
            fullWidth  ? 'w-full' : '',
            className,
          ].filter(Boolean).join(' ')}
        />

        {rightAddon && (
          <span
            aria-hidden="true"
            className="absolute right-3 flex items-center text-slate-400 pointer-events-none"
          >
            {rightAddon}
          </span>
        )}
      </div>

      {/* WCAG 3.3.2: hint text */}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">{hint}</p>
      )}

      {/* WCAG 3.3.1: error with role="alert" */}
      {error && (
        <p id={errorId} role="alert" aria-live="polite" className="mt-1 text-xs text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
