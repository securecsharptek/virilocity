'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Select Component  ·  WCAG 2.2
// ─────────────────────────────────────────────────────────────────────────────
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label:       string;
  options:     Array<{ value: string; label: string; disabled?: boolean }>;
  hint?:       string;
  error?:      string;
  fullWidth?:  boolean;
}

export default function Select({
  label, options, hint, error, fullWidth = true, id, className = '', ...props
}: SelectProps) {
  const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g,'-')}`;
  const hintId   = hint  ? `${selectId}-hint`  : undefined;
  const errorId  = error ? `${selectId}-error` : undefined;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {props.required && <span className="ml-1 text-danger" aria-label="required">*</span>}
      </label>
      <select
        {...props}
        id={selectId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : undefined}
        className={[
          'block rounded-lg border text-sm transition-colors min-h-[2.75rem] px-3 py-2.5',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'bg-white appearance-none cursor-pointer',
          error ? 'border-danger focus:ring-danger' : 'border-mgray focus:ring-teal focus:border-teal',
          fullWidth ? 'w-full' : '',
          className,
        ].filter(Boolean).join(' ')}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint  && !error && <p id={hintId}  className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={errorId} role="alert" aria-live="polite" className="mt-1 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}
