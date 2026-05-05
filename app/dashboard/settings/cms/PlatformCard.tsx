'use client';

import { motion } from 'framer-motion';

export type CMSPlatform = 'wordpress' | 'shopify' | 'webflow' | 'hubspot';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'testing';

export interface PlatformState {
  platform: CMSPlatform;
  status: ConnectionStatus;
  lastTested?: string;
  error?: string;
}

interface PlatformCardProps {
  state: PlatformState;
  loading?: boolean;
  onPrimaryAction: (platform: CMSPlatform) => void;
  onDisconnect?: (platform: CMSPlatform) => void;
  index?: number;
}

const PLATFORM_META: Record<
  CMSPlatform,
  { name: string; mark: string; iconBg: string; iconText: string; glow: string; gradient: string; accentRgb: string }
> = {
  wordpress: {
    name: 'WordPress',
    mark: 'W',
    iconBg: 'bg-[rgba(33,117,155,0.18)]',
    iconText: 'text-[rgba(143,212,241,0.96)]',
    glow: 'rgba(33,117,155,0.55)',
    gradient: 'from-[rgba(33,117,155,0.14)] to-transparent',
    accentRgb: '33,117,155',
  },
  shopify: {
    name: 'Shopify',
    mark: 'S',
    iconBg: 'bg-[rgba(56,142,60,0.18)]',
    iconText: 'text-[rgba(167,232,171,0.96)]',
    glow: 'rgba(56,142,60,0.55)',
    gradient: 'from-[rgba(56,142,60,0.14)] to-transparent',
    accentRgb: '56,142,60',
  },
  webflow: {
    name: 'Webflow',
    mark: 'F',
    iconBg: 'bg-[rgba(30,105,255,0.18)]',
    iconText: 'text-[rgba(165,197,255,0.96)]',
    glow: 'rgba(30,105,255,0.55)',
    gradient: 'from-[rgba(30,105,255,0.14)] to-transparent',
    accentRgb: '30,105,255',
  },
  hubspot: {
    name: 'HubSpot',
    mark: 'H',
    iconBg: 'bg-[rgba(242,101,34,0.18)]',
    iconText: 'text-[rgba(255,193,157,0.96)]',
    glow: 'rgba(242,101,34,0.55)',
    gradient: 'from-[rgba(242,101,34,0.14)] to-transparent',
    accentRgb: '242,101,34',
  },
};

const STATUS_CONFIG: Record<ConnectionStatus, { badge: string; dot: string; label: string; pulse: boolean }> = {
  connected: {
    badge: 'bg-[rgba(30,165,80,0.15)] text-[rgba(134,239,172,0.95)] border-[rgba(30,165,80,0.4)] shadow-[0_0_8px_rgba(30,165,80,0.2)]',
    dot: 'bg-[#4ade80]',
    label: 'Connected',
    pulse: true,
  },
  error: {
    badge: 'bg-[rgba(220,60,60,0.15)] text-[rgba(252,165,165,0.95)] border-[rgba(220,60,60,0.4)] shadow-[0_0_8px_rgba(220,60,60,0.2)]',
    dot: 'bg-[#f87171]',
    label: 'Error',
    pulse: false,
  },
  testing: {
    badge: 'bg-[rgba(201,168,76,0.15)] text-[rgba(253,224,71,0.95)] border-[rgba(201,168,76,0.4)] shadow-[0_0_8px_rgba(201,168,76,0.2)]',
    dot: 'bg-[#facc15]',
    label: 'Testing…',
    pulse: true,
  },
  disconnected: {
    badge: 'bg-[rgba(255,255,255,0.05)] text-[rgba(203,213,225,0.7)] border-[rgba(255,255,255,0.15)]',
    dot: 'bg-[rgba(148,163,184,0.5)]',
    label: 'Not connected',
    pulse: false,
  },
};

const buttonLabel = (status: ConnectionStatus): string => {
  if (status === 'connected') return 'Test connection';
  if (status === 'error') return 'Reconnect';
  if (status === 'testing') return 'Testing…';
  return 'Connect';
};

const formatLastTested = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Last tested ${date.toLocaleString()}`;
};

export default function PlatformCard({ state, loading = false, onPrimaryAction, onDisconnect, index = 0 }: PlatformCardProps) {
  const meta = PLATFORM_META[state.platform];
  const sc = STATUS_CONFIG[state.status];
  const isBusy = loading || state.status === 'testing';
  const showDisconnect = Boolean(onDisconnect) && (state.status === 'connected' || state.status === 'error');

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -3, transition: { duration: 0.22 } }}
      style={{
        background: `linear-gradient(135deg, rgba(${meta.accentRgb},0.07) 0%, rgba(8,18,32,0.6) 60%)`,
        boxShadow: `0 1px 0 0 rgba(255,255,255,0.07) inset, 0 0 0 1px rgba(${meta.accentRgb},0.18), 0 4px 24px rgba(0,0,0,0.35)`,
      }}
      className="relative rounded-2xl p-5 sm:p-6 min-h-[230px] flex flex-col justify-between overflow-hidden cursor-default group"
    >
      {/* subtle top-edge accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${meta.accentRgb},0.7), transparent)` }}
      />

      {/* card glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: `0 0 40px -8px ${meta.glow}` }}
      />

      <div>
        <div className="flex items-center justify-between gap-3">
          {/* Platform icon */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`w-11 h-11 rounded-xl border border-[rgba(${meta.accentRgb},0.3)] ${meta.iconBg} flex items-center justify-center font-mono text-[16px] font-bold ${meta.iconText} shadow-[0_2px_12px_rgba(0,0,0,0.3)]`}
          >
            {meta.mark}
          </motion.div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[10px] tracking-[0.5px] ${sc.badge}`}>
            {sc.pulse ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${sc.dot} opacity-60`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${sc.dot}`} />
              </span>
            ) : (
              <span className={`inline-flex rounded-full h-1.5 w-1.5 ${sc.dot}`} />
            )}
            {sc.label}
          </span>
        </div>

        <h3 className="mt-4 font-sans text-[18px] font-semibold tracking-tight text-[rgba(241,248,252,0.96)]">{meta.name}</h3>

        <p className="mt-1.5 min-h-[34px] font-mono text-[10.5px] leading-relaxed text-[rgba(170,192,212,0.6)]">
          {state.error
            ? <span className="text-[rgba(252,165,165,0.8)]">{state.error}</span>
            : formatLastTested(state.lastTested) ?? 'No connection test run yet'}
        </p>
      </div>

      <div className="mt-5 flex gap-2.5">
        {/* Primary action */}
        <motion.button
          type="button"
          disabled={isBusy}
          onClick={() => onPrimaryAction(state.platform)}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex-1 h-10 rounded-xl font-mono text-[11px] font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, rgba(14,124,123,0.6), rgba(14,124,123,0.35))`,
            border: '1px solid rgba(14,200,198,0.45)',
            color: 'rgba(180,242,241,0.98)',
            boxShadow: '0 2px 12px rgba(14,124,123,0.25)',
          }}
        >
          {isBusy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-[rgba(180,242,241,0.3)] border-t-[rgba(180,242,241,0.9)] rounded-full animate-spin" />
              Testing…
            </span>
          ) : (
            buttonLabel(state.status)
          )}
        </motion.button>

        {/* Disconnect */}
        {showDisconnect && (
          <motion.button
            type="button"
            disabled={isBusy}
            onClick={() => onDisconnect?.(state.platform)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="h-10 px-4 rounded-xl font-mono text-[11px] font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(220,60,60,0.1)',
              border: '1px solid rgba(239,100,100,0.35)',
              color: 'rgba(252,165,165,0.95)',
            }}
          >
            Disconnect
          </motion.button>
        )}
      </div>
    </motion.article>
  );
}
