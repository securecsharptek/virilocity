'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { CMSPlatform } from './PlatformCard';

type Credentials = Record<string, string>;

type FieldSpec = {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'url' | 'password';
  required?: boolean;
};

type PlatformFormSpec = {
  title: string;
  subtitle: string;
  fields: FieldSpec[];
  helperText?: string;
  helperLink?: { href: string; label: string };
  note?: string;
};

interface ConnectionModalProps {
  open: boolean;
  platform: CMSPlatform | null;
  initialValues?: Credentials;
  onClose: () => void;
  onSaveAndTest: (platform: CMSPlatform, credentials: Credentials) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
}

const SPECS: Record<CMSPlatform, PlatformFormSpec> = {
  wordpress: {
    title: 'Connect WordPress',
    subtitle: 'Connect your WordPress site',
    fields: [
      { key: 'siteUrl', label: 'Site URL', placeholder: 'https://yoursite.com', type: 'url' },
      { key: 'username', label: 'Username', placeholder: 'wp-admin', type: 'text' },
      { key: 'appPassword', label: 'App Password', placeholder: 'xxxx xxxx xxxx', type: 'password' },
    ],
    helperText: 'Generate in WP Admin -> Users -> Profile -> Application Passwords',
    helperLink: { href: 'https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/', label: 'WordPress guide' },
  },
  shopify: {
    title: 'Connect Shopify',
    subtitle: 'Connect your Shopify blog',
    fields: [
      { key: 'storeUrl', label: 'Store URL', placeholder: 'store.myshopify.com', type: 'text' },
      { key: 'adminApiToken', label: 'Admin API Token', placeholder: 'shpat_...', type: 'password' },
      { key: 'blogId', label: 'Blog ID', placeholder: '1234567', type: 'text' },
    ],
    helperText: 'Create a private app in Shopify Admin -> Settings -> Apps -> Develop apps',
    helperLink: { href: 'https://help.shopify.com/en/manual/apps/app-types/custom-apps', label: 'Shopify guide' },
  },
  webflow: {
    title: 'Connect Webflow',
    subtitle: 'Connect your Webflow CMS',
    fields: [
      { key: 'siteToken', label: 'Site Token', placeholder: 'Webflow API token', type: 'password' },
      { key: 'siteId', label: 'Site ID', placeholder: 'webflow-site-id', type: 'text' },
      { key: 'collectionId', label: 'Collection ID', placeholder: 'cms-collection-id', type: 'text' },
    ],
    helperText: 'Account Settings -> Integrations -> API Access -> Generate site token',
    helperLink: { href: 'https://developers.webflow.com/data/docs/working-with-the-cms', label: 'Webflow guide' },
  },
  hubspot: {
    title: 'Connect HubSpot CMS',
    subtitle: 'Connect your HubSpot blog publishing API',
    fields: [
      { key: 'cmsApiToken', label: 'CMS API Token', placeholder: 'pat-... (optional if OAuth is connected)', type: 'password', required: false },
      { key: 'blogId', label: 'Blog Settings ID', placeholder: '123456789', type: 'text', required: false },
    ],
    helperText: 'Use OAuth for publishing, or add a private app token. If your portal has more than one blog, paste the HubSpot blog settings ID here.',
    helperLink: { href: 'https://developers.hubspot.com/docs/api/private-apps', label: 'HubSpot guide' },
    note: 'Your HubSpot CRM is already connected. This token is only for blog publishing.',
  },
};

const validate = (platform: CMSPlatform, values: Credentials): Record<string, string> => {
  const out: Record<string, string> = {};
  const spec = SPECS[platform];

  for (const field of spec.fields) {
    const value = (values[field.key] ?? '').trim();
    if (!value && field.required !== false) {
      out[field.key] = `${field.label} is required`;
      continue;
    }

    if (field.type === 'url') {
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          out[field.key] = 'Use a valid URL';
        }
      } catch {
        out[field.key] = 'Use a valid URL';
      }
    }
  }

  return out;
};

export default function ConnectionModal({ open, platform, initialValues, onClose, onSaveAndTest }: ConnectionModalProps) {
  const [values, setValues] = useState<Credentials>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !platform) return;
    const spec = SPECS[platform];
    const next: Credentials = {};
    for (const field of spec.fields) {
      next[field.key] = initialValues?.[field.key] ?? '';
    }
    setValues(next);
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [open, platform, initialValues]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !containerRef.current) return;
      const nodes = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled'));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!first || !last) return;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const spec = useMemo(() => (platform ? SPECS[platform] : null), [platform]);

  const handleSubmit = async () => {
    if (!platform || !spec) return;
    setSubmitError(null);
    setSubmitSuccess(null);

    const validationErrors = validate(platform, values);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    const result = await onSaveAndTest(platform, values);
    setSaving(false);

    if (!result.ok) {
      setSubmitError(result.error ?? 'Check your credentials');
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setSubmitSuccess('Connected successfully');
    window.setTimeout(() => onClose(), 500);
  };

  return (
    <Modal
      open={open && Boolean(spec)}
      onClose={onClose}
      title={spec?.title ?? 'Connect Platform'}
      size="md"
      variant="dashboard"
      dialogClassName="max-w-[480px] sm:max-w-[480px]"
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] font-mono text-[11px] text-[rgba(255,255,255,0.78)] hover:bg-[rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[rgba(14,200,198,0.55)] bg-[rgba(14,124,123,0.62)] font-mono text-[11px] font-bold text-[rgba(220,252,252,0.96)] hover:bg-[rgba(14,124,123,0.82)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Test'}
          </button>
        </>
      )}
    >
      <div ref={containerRef} className="grid grid-cols-1 gap-3">
        <p className="font-sans text-[13px] text-[rgba(216,233,246,0.78)]">{spec?.subtitle}</p>

        {spec?.fields.map(field => (
          <div key={field.key}>
            <label className="font-mono text-[10px] uppercase tracking-[1px] text-[rgba(182,212,228,0.74)]">{field.label}</label>
            <input
              value={values[field.key] ?? ''}
              onChange={(event) => {
                setValues(prev => ({ ...prev, [field.key]: event.target.value }));
                setFieldErrors(prev => {
                  if (!prev[field.key]) return prev;
                  const next = { ...prev };
                  delete next[field.key];
                  return next;
                });
              }}
              type={field.type}
              placeholder={field.placeholder}
              className="mt-1 w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.06)] px-3 py-2 font-mono text-[12px] text-[rgba(235,247,255,0.92)] placeholder:text-[rgba(180,205,220,0.45)] focus:outline-none focus:border-[rgba(14,200,198,0.55)]"
            />
            {fieldErrors[field.key] ? (
              <p className="mt-1 font-mono text-[10px] text-[rgba(248,113,113,0.95)]">{fieldErrors[field.key]}</p>
            ) : null}
          </div>
        ))}

        {spec?.helperText ? (
          <p className="font-mono text-[10px] text-[rgba(168,194,214,0.66)] leading-relaxed">
            {spec.helperText}{' '}
            {spec.helperLink ? (
              <a href={spec.helperLink.href} target="_blank" rel="noopener noreferrer" className="text-[rgba(14,200,198,0.88)] underline underline-offset-2">
                {spec.helperLink.label}
              </a>
            ) : null}
          </p>
        ) : null}

        {spec?.note ? (
          <p className="rounded-lg border border-[rgba(201,168,76,0.32)] bg-[rgba(201,168,76,0.1)] px-3 py-2 font-mono text-[10px] text-[rgba(255,224,148,0.9)] leading-relaxed">{spec.note}</p>
        ) : null}

        {submitError ? <p className="font-mono text-[11px] text-[rgba(248,113,113,0.95)]">{submitError}</p> : null}
        {submitSuccess ? <p className="font-mono text-[11px] text-[rgba(134,239,172,0.95)]">{submitSuccess}</p> : null}
      </div>
    </Modal>
  );
}
