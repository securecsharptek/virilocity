'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Toast Notification  ·  WCAG 4.1.3 Status Messages
// aria-live="polite" for non-critical · aria-live="assertive" for errors
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id:       string;
  message:  string;
  type:     ToastType;
  duration?: number;
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-900 text-green-100 border-green-700',
  error:   'bg-red-900   text-red-100   border-red-700',
  info:    'bg-navy      text-white      border-teal',
  warning: 'bg-amber-900 text-amber-100 border-amber-700',
};

const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};

interface ToastProps {
  toasts:     ToastMessage[];
  onDismiss:  (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
    >
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium',
        'shadow-lg transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        STYLES[toast.type],
      ].join(' ')}
    >
      <span aria-hidden="true" className="flex-shrink-0 font-bold">{ICONS[toast.type]}</span>
      <p className="flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}

// ── useToast hook ──────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return {
    toasts,
    dismiss,
    success: (msg: string, dur?: number) => addToast(msg, 'success', dur),
    error:   (msg: string, dur?: number) => addToast(msg, 'error',   dur),
    info:    (msg: string, dur?: number) => addToast(msg, 'info',    dur),
    warning: (msg: string, dur?: number) => addToast(msg, 'warning', dur),
  };
}
