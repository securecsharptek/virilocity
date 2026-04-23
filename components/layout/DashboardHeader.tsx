// ─────────────────────────────────────────────────────────────────────────────
// DashboardHeader Component — V16.4 Platform Header
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { signOut } from 'next-auth/react';

interface DashboardHeaderProps {
  user?: {
    name: string;
    initials: string;
  };
  tenant?: string;
  status?: {
    text: string;
    count?: string;
  };
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function DashboardHeader({
  user = { name: 'User', initials: 'U' },
  tenant = 'CloudOneSoftware LLC · Enterprise',
  status = { text: 'LIVE', count: '503/503 PASS' },
  theme = 'dark',
  onToggleTheme,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 px-0 mb-5">
      {/* Logo Area */}
      <div className="flex items-center gap-3.5">
        {/* Logo Mark */}
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-[rgba(14,124,123,0.8)] to-[rgba(6,40,60,0.9)] border-[rgba(14,200,198,0.4)] shadow-[0_0_20px_rgba(14,124,123,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]'
              : 'bg-gradient-to-br from-[rgba(240,252,252,0.95)] to-[rgba(219,239,243,0.95)] border-[rgba(14,124,123,0.28)] shadow-[0_0_12px_rgba(14,124,123,0.16),inset_0_1px_0_rgba(255,255,255,0.85)]'
          }`}
          aria-hidden="true"
        >
          ⚡
        </div>

        {/* Logo Text */}
        <div>
          <div className={`font-display text-[15px] font-bold tracking-[2px] ${theme === 'dark' ? 'text-white [text-shadow:0_0_20px_rgba(14,200,198,0.4)]' : 'text-[rgba(19,42,56,0.95)]'}`}>
            VIRILOCITY
          </div>
          <div className={`font-mono text-[9px] tracking-[1.5px] mt-0.5 ${theme === 'dark' ? 'text-[rgba(14,200,198,0.6)]' : 'text-[rgba(14,124,123,0.75)]'}`}>
            V16.4 · APEX-OMNISCIENT-VERCEL
          </div>
        </div>
      </div>

      {/* Header Right */}
      <div className="flex items-center gap-3.5">
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          type="button"
          className={`relative inline-flex h-8 w-[72px] items-center rounded-full border px-1 transition-all hover:border-[rgba(14,200,198,0.45)] ${theme === 'dark' ? 'border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.06)]' : 'border-[rgba(14,124,123,0.26)] bg-[rgba(255,255,255,0.72)]'}`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className={`absolute left-2 font-mono text-[8px] tracking-[1px] ${theme === 'dark' ? 'text-[rgba(255,255,255,0.45)]' : 'text-[rgba(23,55,72,0.45)]'}`}>L</span>
          <span className={`absolute right-2 font-mono text-[8px] tracking-[1px] ${theme === 'dark' ? 'text-[rgba(255,255,255,0.45)]' : 'text-[rgba(23,55,72,0.45)]'}`}>D</span>
          <span
            className={`h-6 w-6 rounded-full transition-all duration-200 ${
              theme === 'dark'
                ? 'translate-x-[40px] bg-gradient-to-br from-[rgba(14,200,198,0.92)] to-[rgba(14,124,123,0.8)] shadow-[0_0_12px_rgba(14,124,123,0.5)]'
                : 'translate-x-0 bg-gradient-to-br from-[rgba(255,245,215,0.95)] to-[rgba(214,195,150,0.9)] shadow-[0_0_10px_rgba(201,168,76,0.4)]'
            }`}
          />
        </button>

        {/* Tenant */}
        <div className={`font-mono text-[9px] tracking-[1px] ${theme === 'dark' ? 'text-[rgba(255,255,255,0.28)]' : 'text-[rgba(21,50,68,0.52)]'}`}>
          {tenant}
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[1.5px] border flex items-center gap-1.5 ${theme === 'dark' ? 'text-[rgba(30,165,80,0.9)] bg-[rgba(30,165,80,0.1)] border-[rgba(30,165,80,0.3)]' : 'text-[rgba(20,134,68,0.92)] bg-[rgba(20,134,68,0.12)] border-[rgba(20,134,68,0.32)]'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1EA550] shadow-[0_0_8px_rgba(30,165,80,0.5)] animate-pulse" />
          {status.text} · {status.count}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            signOut({ callbackUrl: '/auth/login', redirect: true });
          }}
          className={`px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[1.5px] border transition-all cursor-pointer ${theme === 'dark' ? 'text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]' : 'text-[rgba(22,47,63,0.86)] bg-[rgba(255,255,255,0.68)] border-[rgba(23,66,90,0.16)] hover:bg-[rgba(255,255,255,0.88)] hover:border-[rgba(23,66,90,0.28)]'}`}
          title="Sign out"
        >
          SIGN OUT
        </button>

        {/* Avatar */}
        <div
          className={`w-[34px] h-[34px] rounded-full border-2 flex items-center justify-center text-xs font-bold font-display cursor-pointer transition-shadow ${theme === 'dark' ? 'bg-gradient-to-br from-[rgba(201,168,76,0.6)] to-[rgba(100,60,20,0.8)] border-[rgba(201,168,76,0.4)] shadow-[0_0_14px_rgba(201,168,76,0.3)] text-[rgba(201,168,76,0.95)] hover:shadow-[0_0_20px_rgba(201,168,76,0.5)]' : 'bg-gradient-to-br from-[rgba(255,243,216,0.95)] to-[rgba(232,213,164,0.88)] border-[rgba(201,168,76,0.35)] shadow-[0_0_10px_rgba(201,168,76,0.22)] text-[rgba(142,108,25,0.92)] hover:shadow-[0_0_16px_rgba(201,168,76,0.34)]'}`}
          title={user.name}
          role="button"
          tabIndex={0}
        >
          {user.initials}
        </div>
      </div>
    </div>
  );
}
