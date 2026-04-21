// ─────────────────────────────────────────────────────────────────────────────
// Lever Component — V16.4 Mechanical Toggle Switch
// ─────────────────────────────────────────────────────────────────────────────
'use client';

interface LeverProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function Lever({ label, active = false, onClick }: LeverProps) {
  return (
    <div
      className="flex flex-col items-center gap-[7px] cursor-pointer select-none"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Lever Hardware */}
      <div className="w-7 h-[60px] relative flex justify-center">
        {/* Housing/Track */}
        <div className="w-[13px] h-[60px] rounded-[7px] relative overflow-visible bg-gradient-to-b from-[rgba(0,0,0,0.62)] via-[rgba(255,255,255,0.04)] to-[rgba(0,0,0,0.52)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),inset_0_-1px_2px_rgba(255,255,255,0.05),0_1px_0_rgba(255,255,255,0.07)] border border-[rgba(0,0,0,0.55)]">
          {/* Groove */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1 top-[9px] bottom-[9px] rounded-sm bg-gradient-to-b from-[rgba(0,0,0,0.9)] to-[rgba(20,25,45,0.8)] shadow-[inset_0_1px_3px_rgba(0,0,0,1)]">
            {/* Glow fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-sm bg-gradient-to-t from-[rgba(14,124,123,0.65)] to-transparent transition-[height] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)]"
              style={{ height: active ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Knob */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-[5] w-6 h-6 rounded-full transition-all duration-[280ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            active
              ? 'top-[calc(100%-32px)] bg-gradient-to-br from-[rgba(14,200,198,0.88)] via-[rgba(14,124,123,0.72)] to-[rgba(0,55,55,0.85)] shadow-[0_3px_18px_rgba(14,124,123,0.72),0_0_22px_rgba(14,200,198,0.4),0_1px_3px_rgba(0,0,0,0.4),inset_0_1.5px_0_rgba(255,255,255,0.62),inset_0_-1px_0_rgba(0,0,0,0.3)]'
              : '-top-[5px] bg-gradient-to-br from-[rgba(255,255,255,0.88)] via-[rgba(205,218,235,0.6),rgba(120,140,165,0.55)] to-[rgba(45,55,75,0.85)] shadow-[0_3px_14px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.4),inset_0_1.5px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(0,0,0,0.32)]'
          }`}
        >
          {/* Highlight */}
          <div className={`absolute top-1 left-[5px] w-[7px] h-1 rounded-full ${active ? 'bg-[rgba(180,255,255,0.78)]' : 'bg-[rgba(255,255,255,0.78)]'}`} />
          {/* Shadow */}
          <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-2 h-0.5 rounded-[1px] bg-[rgba(0,0,0,0.28)]" />
        </div>
      </div>

      {/* Label */}
      <div
        className={`
          font-mono text-[8px] tracking-[0.4px] text-center max-w-[72px] leading-[1.3]
          transition-all duration-200
          ${
            active
              ? 'text-[rgba(14,200,198,0.92)] [text-shadow:0_0_12px_rgba(14,200,198,0.5)]'
              : 'text-[rgba(255,255,255,0.3)]'
          }
        `}
      >
        {label}
      </div>
    </div>
  );
}
