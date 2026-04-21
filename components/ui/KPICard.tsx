// ─────────────────────────────────────────────────────────────────────────────
// KPICard Component — V16.4 Dashboard Metrics Display
// ─────────────────────────────────────────────────────────────────────────────
import GlassCard from './GlassCard';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: string;
  change?: string;
  subtitle?: string;
  variant?: 'default' | 'teal' | 'gold' | 'green';
  valueColor?: 'default' | 'gold' | 'green';
}

const valueColorStyles = {
  default: '[text-shadow:0_0_30px_rgba(14,200,198,0.25)]',
  gold: '[text-shadow:0_0_30px_rgba(201,168,76,0.3)]',
  green: '[text-shadow:0_0_30px_rgba(30,165,80,0.3)]',
};

export default function KPICard({
  title,
  value,
  icon,
  change,
  subtitle,
  variant = 'teal',
  valueColor = 'default',
}: KPICardProps) {
  const isPositive = change && change.includes('▲');
  const changeColor = isPositive
    ? 'text-[rgba(30,165,80,0.85)]'
    : 'text-[rgba(220,75,55,0.78)]';

  return (
    <GlassCard variant={variant} className="p-5 pb-4 cursor-default" hover={false}>
      {/* Eyebrow */}
      <div className="flex items-center gap-1.5 mb-2 font-mono text-[8.5px] tracking-[2px] text-[rgba(255,255,255,0.38)] uppercase">
        {icon && <span className="text-[11px]">{icon}</span>}
        {title}
      </div>

      {/* Value */}
      <div
        className={`font-display text-[32px] font-bold leading-none text-white tracking-[-1px] mb-1.5 ${valueColorStyles[valueColor]}`}
      >
        {value}
      </div>

      {/* Change indicator */}
      {change && (
        <div className={`font-mono text-[9px] ${changeColor}`}>
          {change}
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <div className="font-mono text-[9px] text-[rgba(255,255,255,0.25)] mt-0.5">
          {subtitle}
        </div>
      )}
    </GlassCard>
  );
}
