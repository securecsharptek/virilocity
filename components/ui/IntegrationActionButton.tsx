'use client';

import type { MouseEventHandler } from 'react';

type IntegrationActionButtonProps = {
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  loading?: boolean;
  disabled?: boolean;
};

export default function IntegrationActionButton({
  label,
  onClick,
  loading = false,
  disabled = false,
}: IntegrationActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'px-3 py-1.5 rounded-[10px] border font-mono text-[8.5px] tracking-[0.8px] uppercase',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(14,200,198,0.45)]',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        disabled
          ? 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)]'
          : 'border-[rgba(14,200,198,0.35)] text-[rgba(14,200,198,0.78)] bg-[rgba(14,124,123,0.14)] hover:bg-[rgba(14,124,123,0.24)]',
      ].join(' ')}
    >
      {loading ? 'Connecting...' : label}
    </button>
  );
}
