// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — KPI Card Component
// WCAG: aria-label with full context, role="figure" for metric group
// ─────────────────────────────────────────────────────────────────────────────

type Trend = 'up' | 'down' | 'flat';

interface KPICardProps {
  label:       string;
  value:       string | number;
  unit?:       string;
  trend?:      Trend;
  trendLabel?: string;
  description?: string;
  color?:      'navy' | 'teal' | 'green' | 'amber';
}

const COLOR_MAP = {
  navy:  'text-navy',
  teal:  'text-teal',
  green: 'text-green-700',
  amber: 'text-amber-700',
};

const TREND_COLORS = {
  up:   'text-green-700',
  down: 'text-red-600',
  flat: 'text-slate-400',
};

const TREND_ICONS = {
  up:   '↑',
  down: '↓',
  flat: '→',
};

export default function KPICard({
  label, value, unit = '', trend, trendLabel,
  description, color = 'navy',
}: KPICardProps) {
  const slug = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <figure
      role="figure"
      aria-label={`${label}: ${value}${unit}${trendLabel ? `, ${trendLabel}` : ''}`}
      className="bg-white rounded-xl border border-mgray p-5"
    >
      <figcaption className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </figcaption>

      <p
        id={`kpi-${slug}`}
        className={`text-3xl font-bold leading-none ${COLOR_MAP[color]}`}
        aria-label={`${value}${unit}`}
      >
        {value}
        {unit && (
          <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
        )}
      </p>

      {(trend || description) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              aria-hidden="true"
              className={`text-sm font-medium ${TREND_COLORS[trend]}`}
            >
              {TREND_ICONS[trend]} {trendLabel}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-400">{description}</span>
          )}
        </div>
      )}
    </figure>
  );
}
