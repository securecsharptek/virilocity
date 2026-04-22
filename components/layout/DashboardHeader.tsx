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
}

export default function DashboardHeader({
  user = { name: 'User', initials: 'U' },
  tenant = 'CloudOneSoftware LLC · Enterprise',
  status = { text: 'LIVE', count: '503/503 PASS' },
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between py-4 px-0 mb-5">
      {/* Logo Area */}
      <div className="flex items-center gap-3.5">
        {/* Logo Mark */}
        <div
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(14,124,123,0.8)] to-[rgba(6,40,60,0.9)] border border-[rgba(14,200,198,0.4)] shadow-[0_0_20px_rgba(14,124,123,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center text-lg"
          aria-hidden="true"
        >
          ⚡
        </div>

        {/* Logo Text */}
        <div>
          <div className="font-display text-[15px] font-bold tracking-[2px] text-white [text-shadow:0_0_20px_rgba(14,200,198,0.4)]">
            VIRILOCITY
          </div>
          <div className="font-mono text-[9px] text-[rgba(14,200,198,0.6)] tracking-[1.5px] mt-0.5">
            V16.4 · APEX-OMNISCIENT-VERCEL
          </div>
        </div>
      </div>

      {/* Header Right */}
      <div className="flex items-center gap-3.5">
        {/* Tenant */}
        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.28)] tracking-[1px]">
          {tenant}
        </div>

        {/* Status Badge */}
        <div className="px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[1.5px] text-[rgba(30,165,80,0.9)] bg-[rgba(30,165,80,0.1)] border border-[rgba(30,165,80,0.3)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1EA550] shadow-[0_0_8px_rgba(30,165,80,0.5)] animate-pulse" />
          {status.text} · {status.count}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[1.5px] text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all cursor-pointer"
          title="Sign out"
        >
          SIGN OUT
        </button>

        {/* Avatar */}
        <div
          className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-[rgba(201,168,76,0.6)] to-[rgba(100,60,20,0.8)] border-2 border-[rgba(201,168,76,0.4)] shadow-[0_0_14px_rgba(201,168,76,0.3)] flex items-center justify-center text-xs font-bold text-[rgba(201,168,76,0.95)] font-display cursor-pointer hover:shadow-[0_0_20px_rgba(201,168,76,0.5)] transition-shadow"
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
