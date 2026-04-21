// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge Component — V16.4 Agent Status Indicators
// ─────────────────────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: 'idle' | 'running' | 'hitl' | 'error' | 'scheduled';
  text?: string;
}

const statusStyles = {
  idle: {
    bg: 'bg-[rgba(255,255,255,0.06)]',
    border: 'border-[rgba(255,255,255,0.1)]',
    text: 'text-[rgba(255,255,255,0.4)]',
    animation: '',
  },
  running: {
    bg: 'bg-[rgba(14,124,123,0.18)]',
    border: 'border-[rgba(14,200,198,0.35)]',
    text: 'text-[rgba(14,200,198,0.95)]',
    animation: 'animate-[glowpulse_2s_infinite]',
  },
  hitl: {
    bg: 'bg-[rgba(201,168,76,0.15)]',
    border: 'border-[rgba(201,168,76,0.42)]',
    text: 'text-[rgba(255,210,100,0.9)]',
    animation: 'animate-[goldpulse_1.8s_infinite]',
  },
  error: {
    bg: 'bg-[rgba(220,75,55,0.14)]',
    border: 'border-[rgba(220,75,55,0.38)]',
    text: 'text-[rgba(255,120,100,0.9)]',
    animation: '',
  },
  scheduled: {
    bg: 'bg-[rgba(100,50,180,0.14)]',
    border: 'border-[rgba(100,50,180,0.38)]',
    text: 'text-[rgba(180,140,255,0.85)]',
    animation: '',
  },
};

const defaultLabels = {
  idle: 'IDLE',
  running: 'RUNNING',
  hitl: 'HITL ⚠',
  error: 'ERROR',
  scheduled: 'Scheduled',
};

export default function StatusBadge({ status, text }: StatusBadgeProps) {
  const styles = statusStyles[status];
  const label = text || defaultLabels[status];

  return (
    <span
      className={`
        inline-flex px-[9px] py-[3px] rounded-xl
        font-mono text-[8px] tracking-[0.5px] whitespace-nowrap
        border ${styles.bg} ${styles.border} ${styles.text} ${styles.animation}
      `}
    >
      {label}
    </span>
  );
}
