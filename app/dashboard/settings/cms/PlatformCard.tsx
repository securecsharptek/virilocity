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
  isLightTheme?: boolean;
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

const buttonLabel = (status: ConnectionStatus, platform: CMSPlatform): string => {
  if (platform === 'hubspot' && status === 'connected') return 'CMS settings';
  if (platform === 'hubspot' && status === 'error') return 'Fix settings';
  if (status === 'connected') return 'Test connection';
  if (status === 'error') return 'Reconnect';
  if (status === 'testing') return 'Testing…';
  return 'Connect';
};

const PlatformLogo = ({ platform, accentRgb }: { platform: CMSPlatform; accentRgb: string }) => {
  const logos: Record<CMSPlatform, React.ReactNode> = {
    wordpress: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill={`rgb(${accentRgb})`} />
      </svg>
    ),
    shopify: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M17.13 2.5c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5s.5-.22.5-.5v-3c0-.28-.22-.5-.5-.5zm-6.38.42c-.19-.14-.45-.09-.59.1L8.5 6.02l-.75-2.96C7.65 2.81 7.4 2.77 7.2 2.92c-.2.15-.25.4-.1.6l1.04 2.42H6c-.27 0-.48.22-.48.49s.21.49.48.49h1.16l1.36 3.22H6c-.27 0-.48.22-.48.49s.21.49.48.49h2.4l1.04 2.45c.07.17.24.28.42.28.04 0 .08 0 .12-.02.23-.1.34-.36.24-.59l-.92-2.12h1.68l.92 2.12c.1.23.36.34.59.24.23-.1.34-.36.24-.59l-1.04-2.45h2.4c.27 0 .48-.22.48-.49s-.21-.49-.48-.49h-1.16l-1.36-3.22h1.16c.27 0 .48-.22.48-.49s-.21-.49-.48-.49h-2.4l-1.04-2.42zm-1.19 3.73l1.08 2.53H8.96l1.59-2.53zm8.44 8.35c0 2.49-1.62 4.6-3.88 5.38v-1.94c1.48-.56 2.52-2.05 2.52-3.79 0-1.74-1.04-3.23-2.52-3.79v-1.94c2.26.78 3.88 2.89 3.88 5.38z" fill={`rgb(${accentRgb})`} />
      </svg>
    ),
    webflow: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm2 9h-4v-2h4v2zm0-3h-4v-2h4v2z" fill={`rgb(${accentRgb})`} />
      </svg>
    ),
    hubspot: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill={`rgb(${accentRgb})`} />
        <path d="M12 5.5C8.41 5.5 5.5 8.41 5.5 12c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5c0-3.59-2.91-6.5-6.5-6.5zm0 11c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z" fill="white" />
        <circle cx="12" cy="7.5" r="1" fill="white" />
        <circle cx="16.5" cy="12" r="1" fill="white" />
        <circle cx="7.5" cy="12" r="1" fill="white" />
      </svg>
    ),
  };

  return logos[platform] || null;
};

const formatLastTested = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Last tested ${date.toLocaleString()}`;
};

export default function PlatformCard({ state, loading = false, onPrimaryAction, onDisconnect, index = 0, isLightTheme = false }: PlatformCardProps) {
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
      style={isLightTheme ? {
        background: 'rgba(248,242,252,0.6)',
        boxShadow: '0 1px 0 0 rgba(164,131,174,0.08) inset, 0 0 0 1px rgba(164,131,174,0.15), 0 4px 24px rgba(143,107,151,0.08)',
      } : {
        background: `linear-gradient(135deg, rgba(${meta.accentRgb},0.07) 0%, rgba(8,18,32,0.6) 60%)`,
        boxShadow: `0 1px 0 0 rgba(255,255,255,0.07) inset, 0 0 0 1px rgba(${meta.accentRgb},0.18), 0 4px 24px rgba(0,0,0,0.35)`,
      }}
      className="relative rounded-2xl p-5 sm:p-6 min-h-[230px] flex flex-col justify-between overflow-hidden cursor-default group"
    >
      {/* subtle top-edge accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full opacity-60"
        style={isLightTheme ? { background: 'linear-gradient(90deg, transparent, rgba(143,107,151,0.5), transparent)' } : { background: `linear-gradient(90deg, transparent, rgba(${meta.accentRgb},0.7), transparent)` }}
      />

      {/* card glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={isLightTheme ? { boxShadow: '0 0 40px -8px rgba(143,107,151,0.3)' } : { boxShadow: `0 0 40px -8px ${meta.glow}` }}
      />

      <div>
        <div className="flex items-center justify-between gap-3">
          {/* Platform icon */}
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`w-11 h-11 rounded-xl border border-[rgba(${meta.accentRgb},0.3)] ${meta.iconBg} flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.3)]`}
          >
            <PlatformLogo platform={state.platform} accentRgb={meta.accentRgb} />
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

        <h3 className="mt-4 font-sans text-[18px] font-semibold tracking-tight" style={isLightTheme ? { color: '#8F6B97' } : { color: 'rgba(241,248,252,0.96)' }}>{meta.name}</h3>

        <p className="mt-1.5 min-h-[34px] font-mono text-[10.5px] leading-relaxed" style={isLightTheme ? { color: '#A483AE' } : { color: 'rgba(170,192,212,0.6)' }}>
          {state.error
            ? <span style={isLightTheme ? { color: '#9A6FA8' } : { color: 'rgba(252,165,165,0.8)' }}>{state.error}</span>
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
          style={isLightTheme ? {
            background: 'rgba(185,156,190,0.15)',
            border: '1px solid rgba(143,107,151,0.4)',
            color: '#8F6B97',
            boxShadow: '0 2px 12px rgba(143,107,151,0.12)',
          } : {
            background: 'linear-gradient(135deg, rgba(14,124,123,0.6), rgba(14,124,123,0.35))',
            border: '1px solid rgba(14,200,198,0.45)',
            color: 'rgba(180,242,241,0.98)',
            boxShadow: '0 2px 12px rgba(14,124,123,0.25)',
          }}
        >
          {isBusy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 rounded-full animate-spin" style={isLightTheme ? { borderColor: 'rgba(143,107,151,0.3)', borderTopColor: '#8F6B97' } : { borderColor: 'rgba(180,242,241,0.3)', borderTopColor: 'rgba(180,242,241,0.9)' }} />
              Testing…
            </span>
          ) : (
            buttonLabel(state.status, state.platform)
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
            style={isLightTheme ? {
              background: 'rgba(185,156,190,0.1)',
              border: '1px solid rgba(143,107,151,0.3)',
              color: '#8F6B97',
            } : {
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
