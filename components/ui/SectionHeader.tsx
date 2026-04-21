// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader Component — V16.4 Section Title with Badge
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  badge?: {
    text: string;
    variant?: 'teal' | 'gold' | 'red';
  };
  rightContent?: React.ReactNode;
}

const badgeVariants = {
  teal: 'text-[rgba(14,200,198,0.7)] bg-[rgba(14,124,123,0.12)] border-[rgba(14,124,123,0.28)]',
  gold: 'text-[rgba(255,210,100,0.8)] bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.28)]',
  red: 'text-[rgba(255,120,100,0.85)] bg-[rgba(220,75,55,0.1)] border-[rgba(220,75,55,0.28)]',
};

export default function SectionHeader({ title, badge, rightContent }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2">
        <div className="font-mono text-[9px] tracking-[3px] text-[rgba(255,255,255,0.4)] uppercase">
          {title}
        </div>
        {badge && (
          <div
            className={`font-mono text-[8.5px] px-2.5 py-[3px] rounded-full border ${
              badgeVariants[badge.variant || 'teal']
            }`}
          >
            {badge.text}
          </div>
        )}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}
