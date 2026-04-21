// ─────────────────────────────────────────────────────────────────────────────
// TabButton Component — V16.4 Pill-style Navigation Tabs
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import type { ReactNode } from 'react';

interface TabButtonProps {
  children: ReactNode;
  active?: boolean;
  variant?: 'default' | 'gold';
  icon?: string;
  count?: number;
  onClick?: () => void;
}

export default function TabButton({
  children,
  active = false,
  variant = 'default',
  icon,
  count,
  onClick,
}: TabButtonProps) {
  const baseStyles = `
    relative flex items-center gap-2 px-[18px] py-[9px] rounded-full border-none
    cursor-pointer font-sans text-[11px] font-bold tracking-wide uppercase
    whitespace-nowrap select-none
    transition-all duration-[170ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
    shadow-[0_6px_18px_rgba(0,0,0,0.42),0_2px_5px_rgba(0,0,0,0.28),inset_0_1.5px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,255,255,0.07)]
    before:content-[''] before:absolute before:top-[3px] before:left-[8px] before:right-[8px] before:h-[42%]
    before:bg-gradient-to-b before:from-[rgba(255,255,255,0.16)] before:to-transparent
    before:rounded-full before:pointer-events-none
    hover:transform hover:-translate-y-[1.5px]
    hover:shadow-[0_10px_26px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.32),inset_0_1.5px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(0,0,0,0.18),inset_0_0_0_1px_rgba(255,255,255,0.12)]
    active:transform active:translate-y-[1px] active:scale-[0.97]
    active:shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_3px_10px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.1)]
  `;

  const inactiveStyles = `
    text-[rgba(255,255,255,0.38)]
    bg-gradient-to-br from-[rgba(255,255,255,0.13)] via-[rgba(255,255,255,0.04)] to-[rgba(0,0,0,0.22)]
    hover:text-[rgba(255,255,255,0.7)]
  `;

  const activeDefaultStyles = `
    text-[rgba(14,200,198,1)]
    bg-gradient-to-br from-[rgba(14,124,123,0.52)] via-[rgba(14,124,123,0.26)] to-[rgba(0,38,38,0.32)]
    shadow-[0_0_0_1px_rgba(14,200,198,0.35),0_0_28px_rgba(14,124,123,0.48),0_6px_22px_rgba(0,0,0,0.42),inset_0_1.5px_0_rgba(14,220,218,0.42),inset_0_-1px_0_rgba(0,0,0,0.28),inset_0_0_30px_rgba(14,124,123,0.12)]
    [text-shadow:0_0_18px_rgba(14,200,198,0.8),0_0_35px_rgba(14,200,198,0.35)]
  `;

  const activeGoldStyles = `
    text-[rgba(255,210,100,1)]
    bg-gradient-to-br from-[rgba(201,168,76,0.45)] via-[rgba(201,168,76,0.18)] to-[rgba(55,35,0,0.35)]
    shadow-[0_0_0_1px_rgba(255,210,100,0.38),0_0_28px_rgba(201,168,76,0.45),0_6px_22px_rgba(0,0,0,0.42),inset_0_1.5px_0_rgba(255,210,100,0.42),inset_0_-1px_0_rgba(0,0,0,0.28)]
    [text-shadow:0_0_18px_rgba(255,210,100,0.8)]
  `;

  const activeStyles = active
    ? variant === 'gold'
      ? activeGoldStyles
      : activeDefaultStyles
    : inactiveStyles;

  return (
    <button
      className={`${baseStyles} ${activeStyles}`}
      onClick={onClick}
      type="button"
      aria-pressed={active}
    >
      {icon && <span className="text-[12px] leading-none">{icon}</span>}
      {children}
      {count !== undefined && (
        <span className="font-mono text-[9px] opacity-55 ml-1">
          {count}
        </span>
      )}
    </button>
  );
}
