'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import ConnectionModal from './ConnectionModal';
import PlatformCard, { type CMSPlatform, type PlatformState } from './PlatformCard';

type PlatformsResponse = {
  ok?: boolean;
  platforms?: Array<{
    provider: string;
    configured: boolean;
    connected: boolean;
    statusText: string;
    details?: string;
    siteName?: string;
    collectionName?: string;
  }>;
};

type WebflowDiscoveryResponse = {
  ok?: boolean;
  selectedSiteId?: string;
  sites?: Array<{ id: string; name: string }>;
  collections?: Array<{ id: string; name: string; slug?: string }>;
  error?: string;
};

type AiReviewSuggestion = {
  title: string;
  slug: string;
  htmlBody: string;
};

type AiReviewDetails = {
  agentType?: string;
  score?: number | null;
  reasons?: string[];
  summary?: string;
  recommendations?: string[];
  suggestedDraft?: AiReviewSuggestion | null;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load CMS platforms');
  return res.json() as Promise<T>;
};

const ALL_PLATFORMS: CMSPlatform[] = ['wordpress', 'shopify', 'webflow', 'hubspot'];

const toInitialState = (platform: CMSPlatform): PlatformState => ({
  platform,
  status: 'disconnected',
});

const mapServerStatus = (platform: CMSPlatform, raw?: { configured: boolean; connected: boolean; details?: string }): PlatformState => {
  if (!raw) return toInitialState(platform);
  if (raw.connected) return { platform, status: 'connected' };
  if (raw.configured && !raw.connected) return { platform, status: 'error', error: raw.details ?? 'Connection check failed' };
  return { platform, status: 'disconnected' };
};

const platformTitle = (platform: CMSPlatform): string => {
  if (platform === 'wordpress') return 'WordPress';
  if (platform === 'shopify') return 'Shopify';
  if (platform === 'webflow') return 'Webflow';
  return 'HubSpot';
};

const mapShopifyError = (reason: string | null): string => {
  if (!reason) return 'Shopify connection failed';
  if (reason === 'invalid_shop') return 'Enter a valid Shopify .myshopify.com store domain.';
  if (reason === 'missing_blog') return 'Shopify connected, but no blog was found. Create a blog in Shopify, then reconnect.';
  if (reason === 'invalid_hmac' || reason === 'invalid_state') return 'Shopify OAuth validation failed. Please try connecting again.';
  if (reason === 'missing_tenant' || reason === 'missing_code') return 'Shopify OAuth did not complete. Please try again.';
  return decodeURIComponent(reason);
};

const mapWebflowError = (reason: string | null): string => {
  if (!reason) return 'Webflow connection failed';
  if (reason === 'missing_tenant') return 'Webflow OAuth could not determine tenant. Please sign in and retry.';
  if (reason === 'missing_code') return 'Webflow OAuth did not complete. Please try again.';
  if (reason === 'invalid_state') return 'Webflow OAuth validation failed. Please reconnect.';
  if (reason === 'missing_site') return 'No Webflow sites were found for this account.';
  if (reason === 'missing_collection') return 'No CMS collections were found in the selected Webflow site.';
  return decodeURIComponent(reason);
};

const saveConnection = async (platform: CMSPlatform, credentials: Record<string, string>) => {
  const response = await fetch('/api/cms/save-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, credentials }),
  });
  const body = (await response.json().catch(() => ({}))) as { saved?: boolean; error?: string };
  if (!response.ok || !body.saved) {
    throw new Error(body.error ?? 'Unable to save connection');
  }
};

const testConnection = async (platform: CMSPlatform) => {
  const response = await fetch('/api/cms/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
  const body = (await response.json().catch(() => ({}))) as { connected?: boolean; error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? 'Unable to test connection');
  }

  return {
    connected: Boolean(body.connected),
    error: body.error,
  };
};

const disconnectPlatform = async (platform: CMSPlatform) => {
  const response = await fetch('/api/cms/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? 'Unable to disconnect platform');
  }
};

interface CMSConnectionsProps {
  embedded?: boolean;
}

export default function CMSConnections({ embedded = false }: CMSConnectionsProps) {
  const { data, isLoading, mutate } = useSWR<PlatformsResponse>('/api/cms/platforms', fetcher, {
    revalidateOnFocus: false,
  });

  const [platformState, setPlatformState] = useState<Record<CMSPlatform, PlatformState>>({
    wordpress: toInitialState('wordpress'),
    shopify: toInitialState('shopify'),
    webflow: toInitialState('webflow'),
    hubspot: toInitialState('hubspot'),
  });

  const [loadingByPlatform, setLoadingByPlatform] = useState<Record<CMSPlatform, boolean>>({
    wordpress: false,
    shopify: false,
    webflow: false,
    hubspot: false,
  });

  const [activeModal, setActiveModal] = useState<CMSPlatform | null>(null);
  const [webflowSites, setWebflowSites] = useState<Array<{ id: string; name: string }>>([]);
  const [webflowCollections, setWebflowCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [webflowSelection, setWebflowSelection] = useState<{ siteId: string; collectionId: string }>({
    siteId: '',
    collectionId: '',
  });
  const [webflowLoadingOptions, setWebflowLoadingOptions] = useState(false);

  const loadWebflowDiscovery = useCallback(async (siteId?: string) => {
    setWebflowLoadingOptions(true);
    try {
      const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
      const response = await fetch(`/api/integrations/webflow/discovery${query}`, { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as WebflowDiscoveryResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'Unable to discover Webflow sites and collections');
      }

      const sites = body.sites ?? [];
      const collections = body.collections ?? [];
      const selectedSiteId = body.selectedSiteId ?? sites[0]?.id ?? '';
      const selectedCollectionId = collections[0]?.id ?? '';

      setWebflowSites(sites);
      setWebflowCollections(collections.map(item => ({ id: item.id, name: item.name })));
      setWebflowSelection({
        siteId: selectedSiteId,
        collectionId: selectedCollectionId,
      });

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webflow discovery failed';
      setPlatformState(prev => ({
        ...prev,
        webflow: {
          platform: 'webflow',
          status: 'error',
          error: message,
          lastTested: new Date().toISOString(),
        },
      }));
      return { ok: false, error: message };
    } finally {
      setWebflowLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (!data?.platforms) return;
    const normalized = data.platforms.reduce<Record<string, { configured: boolean; connected: boolean; details?: string }>>((acc, item) => {
      acc[item.provider] = { configured: item.configured, connected: item.connected, details: item.details };
      return acc;
    }, {});

    setPlatformState(prev => ({
      ...prev,
      wordpress: mapServerStatus('wordpress', normalized['wordpress']),
      shopify: mapServerStatus('shopify', normalized['shopify']),
      webflow: mapServerStatus('webflow', normalized['webflow']),
      hubspot: mapServerStatus('hubspot', normalized['hubspot']),
    }));
  }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopifyStatus = params.get('shopify');
    const webflowStatus = params.get('webflow');

    if (shopifyStatus === 'connected') {
      void mutate();
    }

    if (shopifyStatus === 'error') {
      setPlatformState(prev => ({
        ...prev,
        shopify: {
          platform: 'shopify',
          status: 'error',
          error: mapShopifyError(params.get('reason')),
          lastTested: new Date().toISOString(),
        },
      }));
    }

    if (webflowStatus === 'connected') {
      void mutate();
      setActiveModal('webflow');
      void loadWebflowDiscovery();
    }

    if (webflowStatus === 'error') {
      setPlatformState(prev => ({
        ...prev,
        webflow: {
          platform: 'webflow',
          status: 'error',
          error: mapWebflowError(params.get('reason')),
          lastTested: new Date().toISOString(),
        },
      }));
    }
  }, [mutate, loadWebflowDiscovery]);

  const setPlatformBusy = (platform: CMSPlatform, busy: boolean) => {
    setLoadingByPlatform(prev => ({ ...prev, [platform]: busy }));
  };

  const setTestingState = (platform: CMSPlatform) => {
    setPlatformState(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        status: 'testing',
        error: undefined,
      },
    }));
  };

  const runTest = async (platform: CMSPlatform) => {
    setPlatformBusy(platform, true);
    setTestingState(platform);

    try {
      const tested = await testConnection(platform);
      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          platform,
          status: tested.connected ? 'connected' : 'error',
          lastTested: new Date().toISOString(),
          error: tested.connected ? undefined : tested.error ?? 'Check your credentials',
        },
      }));
    } catch (error) {
      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          platform,
          status: 'error',
          lastTested: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Connection test failed',
        },
      }));
    } finally {
      setPlatformBusy(platform, false);
    }
  };

  const handlePrimaryAction = (platform: CMSPlatform) => {
    const status = platformState[platform].status;

    // HubSpot starts with OAuth, then uses this modal for CMS-specific settings.
    if (platform === 'hubspot') {
      if (status === 'connected' || status === 'error') {
        setActiveModal('hubspot');
        return;
      }

      const returnTo = encodeURIComponent('/dashboard?tab=settings&lever=cms');
      window.location.assign(`/api/hubspot/auth?returnTo=${returnTo}&includeContentScope=true`);
      return;
    }

    if (platform === 'webflow') {
      if (status === 'disconnected') {
        void handleStartOAuth('webflow', {});
        return;
      }

      setActiveModal('webflow');
      void loadWebflowDiscovery();
      return;
    }

    if (status === 'connected') {
      void runTest(platform);
      return;
    }
    setActiveModal(platform);
  };

  const handleSaveAndTest = async (platform: CMSPlatform, credentials: Record<string, string>) => {
    setPlatformBusy(platform, true);
    const previous = platformState[platform];

    setPlatformState(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        status: 'testing',
        error: undefined,
      },
    }));

    try {
      const withPlatformMetadata = platform === 'webflow'
        ? {
            ...credentials,
            siteName: webflowSites.find(site => site.id === credentials['siteId'])?.name ?? '',
            collectionName: webflowCollections.find(collection => collection.id === credentials['collectionId'])?.name ?? '',
          }
        : credentials;

      await saveConnection(platform, withPlatformMetadata);
      const tested = await testConnection(platform);

      if (!tested.connected) {
        setPlatformState(prev => ({
          ...prev,
          [platform]: {
            platform,
            status: 'error',
            lastTested: new Date().toISOString(),
            error: tested.error ?? 'Check your credentials',
          },
        }));
        return { ok: false, error: tested.error ?? 'Check your credentials' };
      }

      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          platform,
          status: 'connected',
          lastTested: new Date().toISOString(),
        },
      }));

      await mutate();
      return { ok: true };
    } catch (error) {
      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          ...previous,
          status: 'error',
          error: error instanceof Error ? error.message : 'Check your credentials',
          lastTested: new Date().toISOString(),
        },
      }));
      return { ok: false, error: error instanceof Error ? error.message : 'Check your credentials' };
    } finally {
      setPlatformBusy(platform, false);
    }
  };

  const handleStartOAuth = async (platform: CMSPlatform, credentials: Record<string, string>) => {
    const returnTo = encodeURIComponent('/dashboard?tab=settings&lever=cms');

    if (platform === 'webflow') {
      window.location.assign(`/api/integrations/webflow/connect?returnTo=${returnTo}`);
      return { ok: true };
    }

    if (platform !== 'shopify') {
      return { ok: false, error: 'OAuth is only supported for Shopify and Webflow in this flow.' };
    }

    const storeUrl = (credentials['storeUrl'] ?? '').trim();
    if (!storeUrl) {
      return { ok: false, error: 'Store URL is required', fieldErrors: { storeUrl: 'Store URL is required' } };
    }

    window.location.assign(`/api/shopify/auth?shop=${encodeURIComponent(storeUrl)}&returnTo=${returnTo}`);
    return { ok: true };
  };

  const handleDisconnect = async (platform: CMSPlatform) => {
    setPlatformBusy(platform, true);

    try {
      await disconnectPlatform(platform);
      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          platform,
          status: 'disconnected',
          error: undefined,
          lastTested: undefined,
        },
      }));

      if (selectedPlatform === platform) {
        setSelectedPlatform('');
      }

      if (platform === 'webflow') {
        setWebflowSites([]);
        setWebflowCollections([]);
        setWebflowSelection({ siteId: '', collectionId: '' });
      }

      await mutate();
    } catch (error) {
      setPlatformState(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'error',
          error: error instanceof Error ? error.message : 'Disconnect failed',
        },
      }));
    } finally {
      setPlatformBusy(platform, false);
    }
  };

  const testAllConnections = async () => {
    for (const platform of ALL_PLATFORMS) {
      // Sequential to avoid burst spikes to provider APIs
      // eslint-disable-next-line no-await-in-loop
      await runTest(platform);
    }
  };

  const connectedCount = ALL_PLATFORMS.filter(platform => platformState[platform].status === 'connected').length;
  const connectedPlatforms = ALL_PLATFORMS.filter(platform => platformState[platform].status === 'connected');

  // ─── CMS Publisher state ────────────────────────────────────────────────────
  const [topic, setTopic] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedSlug, setGeneratedSlug] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [geoScore, setGeoScore] = useState<number | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<CMSPlatform | ''>('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; url?: string; itemId?: string; error?: string; action?: 'hubspot-settings' } | null>(null);
  const [aiReview, setAiReview] = useState<AiReviewDetails | null>(null);

  const isHubSpotBlogSetupError = (message?: string): boolean => {
    return Boolean(message && /HubSpot blog|Blog Settings ID|no HubSpot blog/i.test(message));
  };

  const handleGenerateDraft = async () => {
    if (!topic.trim()) return;
    setGenerateLoading(true);
    setGenerateError(null);
    setPublishResult(null);
    setAiReview(null);
    try {
      const res = await fetch('/dashboard/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateCmsDraft', prompt: topic }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        generatedCmsDraft?: { title?: string; slug?: string; body?: string; geoScore?: number | null };
        error?: string;
      };
      if (!res.ok || !json.generatedCmsDraft) {
        throw new Error((json.error as string | undefined) ?? 'AI generation failed');
      }
      const draft = json.generatedCmsDraft;
      setGeneratedTitle(draft.title ?? '');
      setGeneratedSlug(draft.slug ?? '');
      setGeneratedBody(draft.body ?? '');
      setGeoScore(draft.geoScore ?? null);
      const defaultPlatform = connectedPlatforms[0];
      if (defaultPlatform && !selectedPlatform) {
        setSelectedPlatform(defaultPlatform);
      }
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedPlatform || !generatedTitle || !generatedBody) return;
    setPublishLoading(true);
    setPublishResult(null);
    setAiReview(null);
    try {
      if (selectedPlatform === 'hubspot') {
        const tested = await testConnection('hubspot');
        if (!tested.connected) {
          const error = tested.error ?? 'HubSpot CMS is not ready for publishing.';
          setPlatformState(prev => ({
            ...prev,
            hubspot: {
              platform: 'hubspot',
              status: 'error',
              lastTested: new Date().toISOString(),
              error,
            },
          }));
          if (isHubSpotBlogSetupError(error)) {
            setActiveModal('hubspot');
          }
          setPublishResult({ ok: false, error, action: isHubSpotBlogSetupError(error) ? 'hubspot-settings' : undefined });
          return;
        }
      }

      const res = await fetch('/api/cms/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedPlatform,
          title: generatedTitle,
          slug: generatedSlug || generatedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          htmlBody: generatedBody,
          status: 'published',
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: { url?: string; itemId?: string };
        error?: {
          code?: string;
          message?: string;
          review?: AiReviewDetails;
        };
      };
      if (!res.ok) {
        const message = json.error?.message ?? `Publish failed (${res.status})`;
        if (json.error?.code === 'blocked_by_ai_review' && json.error.review) {
          setAiReview(json.error.review);
        }
        if (selectedPlatform === 'hubspot' && isHubSpotBlogSetupError(message)) {
          setActiveModal('hubspot');
          setPublishResult({ ok: false, error: message, action: 'hubspot-settings' });
          return;
        }
        throw new Error(message);
      }
      setPublishResult({ ok: true, url: json.result?.url, itemId: json.result?.itemId });
      setAiReview(null);
    } catch (e) {
      setPublishResult({ ok: false, error: e instanceof Error ? e.message : 'Publish failed' });
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <main className={embedded
      ? 'px-0 py-0'
      : 'min-h-screen bg-[radial-gradient(ellipse_at_0%_0%,rgba(14,124,123,0.22),transparent_50%),radial-gradient(ellipse_at_100%_0%,rgba(201,168,76,0.14),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(30,105,255,0.08),transparent_50%),linear-gradient(180deg,rgba(2,10,22,0.98),rgba(1,6,14,1))] px-4 sm:px-6 py-8 sm:py-12'}>
      <div className={embedded ? 'w-full' : 'mx-auto w-full max-w-5xl'}>

        {/* ── Page header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-3 mb-2">
            {/* accent bar */}
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-[rgba(14,200,198,0.9)] to-[rgba(14,124,123,0.3)]" />
            <h1
              className="font-sans text-[28px] sm:text-[36px] font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, rgba(241,248,252,0.98) 0%, rgba(180,242,241,0.85) 50%, rgba(140,220,218,0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CMS Connections
            </h1>
          </div>
          <p className="ml-4 mt-1 font-sans text-[14px] text-[rgba(174,198,218,0.72)] max-w-2xl leading-relaxed">
            Connect your publishing platforms. Virilocity will publish content and inject JSON-LD schema automatically.
          </p>
        </motion.div>

        {/* ── Platform grid ─────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {ALL_PLATFORMS.map((platform, i) => {
            if (isLoading) {
              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-2xl p-5 sm:p-6 min-h-[230px] animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-11 h-11 rounded-xl bg-[rgba(255,255,255,0.08)]" />
                  <div className="mt-4 h-5 w-28 rounded-lg bg-[rgba(255,255,255,0.07)]" />
                  <div className="mt-2 h-3.5 w-36 rounded bg-[rgba(255,255,255,0.06)]" />
                  <div className="mt-auto pt-16 h-10 w-full rounded-xl bg-[rgba(255,255,255,0.08)]" />
                </motion.div>
              );
            }

            return (
              <PlatformCard
                key={platform}
                index={i}
                state={platformState[platform]}
                loading={loadingByPlatform[platform]}
                onPrimaryAction={handlePrimaryAction}
                onDisconnect={handleDisconnect}
              />
            );
          })}
        </div>

        {/* ── Status bar ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 }}
          className="mt-5 flex items-center gap-3 flex-wrap"
        >
          <motion.button
            type="button"
            onClick={() => void testAllConnections()}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="h-10 px-5 rounded-xl font-mono text-[11px] font-bold tracking-wide transition-colors"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))',
              border: '1px solid rgba(201,168,76,0.4)',
              color: 'rgba(253,224,71,0.9)',
              boxShadow: '0 2px 12px rgba(201,168,76,0.12)',
            }}
          >
            Test All Connections
          </motion.button>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[rgba(74,222,128,0.7)]" />
            <span className="font-mono text-[11px] text-[rgba(180,200,220,0.7)]">
              <span className="text-[rgba(134,239,172,0.9)] font-bold">{connectedCount}</span>
              {' '}of 4 platforms connected
            </span>
          </div>
        </motion.div>

        {/* ── AI Content Publisher ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(14,124,123,0.12) 0%, rgba(8,18,32,0.7) 60%)',
            border: '1px solid rgba(14,200,198,0.2)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* header bar */}
          <div
            className="px-5 sm:px-6 py-4 border-b"
            style={{ borderColor: 'rgba(14,200,198,0.12)', background: 'rgba(14,124,123,0.07)' }}
          >
            <div className="flex items-center gap-2.5">
              {/* icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px]"
                style={{ background: 'rgba(14,124,123,0.3)', border: '1px solid rgba(14,200,198,0.3)' }}
              >
                ✦
              </div>
              <div>
                <h2 className="font-sans text-[16px] font-semibold text-[rgba(241,248,252,0.96)]">AI Content Publisher</h2>
                <p className="font-sans text-[12px] text-[rgba(160,200,224,0.6)]">
                  Generate &amp; publish AI-written content to any connected platform
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* Topic input + Generate */}
            <div className="flex gap-3 flex-wrap sm:flex-nowrap items-start">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !generateLoading) void handleGenerateDraft(); }}
                  placeholder="e.g. 10 SEO tips for local businesses in 2025"
                  className="w-full h-11 pl-4 pr-4 rounded-xl font-sans text-[14px] text-[rgba(241,248,252,0.92)] placeholder:text-[rgba(160,192,220,0.38)] focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,200,198,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,124,123,0.15)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <motion.button
                type="button"
                onClick={() => void handleGenerateDraft()}
                disabled={!topic.trim() || generateLoading}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="h-11 px-5 rounded-xl font-mono text-[12px] font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,160,158,0.9), rgba(14,100,100,0.8))',
                  border: '1px solid rgba(14,200,198,0.4)',
                  color: 'rgba(255,255,255,0.95)',
                  boxShadow: generateLoading ? 'none' : '0 4px 16px rgba(14,124,123,0.35)',
                }}
              >
                {generateLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin" />
                    Generating…
                  </span>
                ) : '✦ Generate with AI'}
              </motion.button>
            </div>

            <AnimatePresence>
              {generateError && (
                <motion.p
                  key="gen-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 font-mono text-[11px] text-[rgba(252,165,165,0.85)]"
                >
                  {generateError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Generated content fields */}
            <AnimatePresence>
              {(generatedTitle || generatedBody) && (
                <motion.div
                  key="draft-fields"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6 flex flex-col gap-4"
                >
                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'rgba(14,200,198,0.15)' }} />
                    <span className="font-mono text-[10px] text-[rgba(14,200,198,0.5)] tracking-widest uppercase">Generated Draft</span>
                    <div className="h-px flex-1" style={{ background: 'rgba(14,200,198,0.15)' }} />
                  </div>

                  {geoScore !== null && (
                    <motion.span
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="self-start font-mono text-[11px] px-3 py-1.5 rounded-full font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))',
                        border: '1px solid rgba(201,168,76,0.4)',
                        color: 'rgba(253,224,71,0.92)',
                        boxShadow: '0 0 12px rgba(201,168,76,0.15)',
                      }}
                    >
                      GEO Score: {geoScore}/100
                    </motion.span>
                  )}

                  {[
                    { id: 'title', label: 'Title', value: generatedTitle, setter: setGeneratedTitle, type: 'input' as const, mono: false },
                    { id: 'slug', label: 'Slug', value: generatedSlug, setter: setGeneratedSlug, type: 'input' as const, mono: true },
                  ].map(field => (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <label className="font-sans text-[10px] font-bold text-[rgba(14,200,198,0.55)] uppercase tracking-[0.8px]">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        className={`h-10 px-4 rounded-xl ${field.mono ? 'font-mono text-[13px]' : 'font-sans text-[14px]'} text-[rgba(241,248,252,0.9)] focus:outline-none transition-all`}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,200,198,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,124,123,0.12)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  ))}

                  <div className="flex flex-col gap-1.5">
                    <label className="font-sans text-[10px] font-bold text-[rgba(14,200,198,0.55)] uppercase tracking-[0.8px]">Body (HTML)</label>
                    <textarea
                      value={generatedBody}
                      onChange={e => setGeneratedBody(e.target.value)}
                      rows={8}
                      className="px-4 py-3 rounded-xl font-mono text-[12px] leading-relaxed text-[rgba(241,248,252,0.75)] focus:outline-none resize-y transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,200,198,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,124,123,0.12)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Platform selector + Publish */}
                  <div
                    className="mt-1 p-4 rounded-xl flex items-end gap-4 flex-wrap"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex flex-col gap-1.5 min-w-[160px]">
                      <label className="font-sans text-[10px] font-bold text-[rgba(14,200,198,0.55)] uppercase tracking-[0.8px]">Publish to</label>
                      <select
                        value={selectedPlatform}
                        onChange={e => setSelectedPlatform(e.target.value as CMSPlatform | '')}
                        className="h-11 px-4 rounded-xl font-sans text-[14px] text-[rgba(241,248,252,0.85)] focus:outline-none transition-colors"
                        style={{ background: 'rgba(10,22,40,0.98)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(241,248,252,0.85)' }}
                      >
                        <option value="">— select platform —</option>
                        {connectedPlatforms.map(p => (
                          <option key={p} value={p}>{platformTitle(p)}</option>
                        ))}
                        {connectedPlatforms.length === 0 && (
                          <option value="" disabled>No platforms connected</option>
                        )}
                      </select>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => void handlePublish()}
                      disabled={!selectedPlatform || !generatedTitle || !generatedBody || publishLoading}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="h-11 px-7 rounded-xl font-mono text-[12px] font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      style={{
                        background: publishLoading
                          ? 'rgba(14,124,123,0.5)'
                          : 'linear-gradient(135deg, rgba(14,160,158,0.95), rgba(14,100,100,0.85))',
                        border: '1px solid rgba(14,200,198,0.45)',
                        color: 'rgba(255,255,255,0.95)',
                        boxShadow: publishLoading ? 'none' : '0 4px 20px rgba(14,124,123,0.4)',
                      }}
                    >
                      {publishLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin" />
                          Publishing…
                        </span>
                      ) : `↑ Publish to ${selectedPlatform ? platformTitle(selectedPlatform as CMSPlatform) : '…'}`}
                    </motion.button>
                  </div>

                  {/* Publish result */}
                  <AnimatePresence>
                    {publishResult && (
                      <motion.div
                        key="publish-result"
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl px-4 py-3 font-sans text-[13px]"
                        style={publishResult.ok ? {
                          background: 'rgba(52,211,153,0.07)',
                          border: '1px solid rgba(52,211,153,0.35)',
                          color: 'rgba(167,243,208,0.95)',
                          boxShadow: '0 0 16px rgba(52,211,153,0.1)',
                        } : {
                          background: 'rgba(239,100,100,0.07)',
                          border: '1px solid rgba(239,100,100,0.35)',
                          color: 'rgba(252,165,165,0.95)',
                        }}
                      >
                        {publishResult.ok ? (
                          <>
                            <span className="font-bold">✓ Published!</span>
                            {publishResult.itemId && <> &nbsp;Post ID: <code className="font-mono text-[12px] opacity-80">{publishResult.itemId}</code></>}
                            {publishResult.url && (
                              <> &nbsp;—&nbsp;
                                <a href={publishResult.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white transition-colors">
                                  View post ↗
                                </a>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="font-bold">✕ Publish failed:</span> {publishResult.error}
                            {publishResult.action === 'hubspot-settings' ? (
                              <button
                                type="button"
                                onClick={() => setActiveModal('hubspot')}
                                className="ml-3 rounded-lg border border-[rgba(252,165,165,0.45)] px-3 py-1 font-mono text-[11px] font-bold text-[rgba(255,220,220,0.96)] hover:bg-[rgba(252,165,165,0.12)] transition-colors"
                              >
                                Open HubSpot settings
                              </button>
                            ) : null}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {aiReview && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="rounded-xl px-4 py-4"
                      style={{
                        background: 'rgba(239,100,100,0.07)',
                        border: '1px solid rgba(239,100,100,0.35)',
                        color: 'rgba(255,220,220,0.96)',
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-[1px] text-[rgba(255,190,190,0.9)]">AI Review</span>
                        {typeof aiReview.agentType === 'string' && aiReview.agentType ? (
                          <span className="rounded-full border border-[rgba(255,160,160,0.45)] px-2 py-0.5 font-mono text-[10px] text-[rgba(255,210,210,0.96)]">
                            Agent: {aiReview.agentType}
                          </span>
                        ) : null}
                        {typeof aiReview.score === 'number' ? (
                          <span className="rounded-full border border-[rgba(255,160,160,0.45)] px-2 py-0.5 font-mono text-[10px] text-[rgba(255,210,210,0.96)]">
                            Score: {Math.round(aiReview.score)}/100
                          </span>
                        ) : null}
                      </div>

                      {aiReview.summary ? (
                        <p className="mt-2 font-sans text-[13px] text-[rgba(255,225,225,0.95)]">{aiReview.summary}</p>
                      ) : null}

                      {Array.isArray(aiReview.reasons) && aiReview.reasons.length > 0 ? (
                        <div className="mt-3">
                          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[rgba(255,180,180,0.86)]">Why blocked</p>
                          <ul className="mt-1 list-disc pl-5 font-sans text-[12px] leading-relaxed text-[rgba(255,220,220,0.92)]">
                            {aiReview.reasons.slice(0, 5).map((reason, index) => (
                              <li key={`reason-${index}`}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {Array.isArray(aiReview.recommendations) && aiReview.recommendations.length > 0 ? (
                        <div className="mt-3">
                          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[rgba(255,180,180,0.86)]">Recommended fixes</p>
                          <ul className="mt-1 list-disc pl-5 font-sans text-[12px] leading-relaxed text-[rgba(255,220,220,0.92)]">
                            {aiReview.recommendations.slice(0, 5).map((item, index) => (
                              <li key={`fix-${index}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {aiReview.suggestedDraft ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setGeneratedBody(aiReview.suggestedDraft?.htmlBody ?? generatedBody);
                              setPublishResult(null);
                            }}
                            className="rounded-lg border border-[rgba(255,170,170,0.45)] px-3 py-1.5 font-mono text-[11px] font-bold text-[rgba(255,230,230,0.96)] hover:bg-[rgba(255,170,170,0.12)] transition-colors"
                          >
                            Insert Suggested Body
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const draft = aiReview.suggestedDraft;
                              if (!draft) return;
                              setGeneratedTitle(draft.title);
                              setGeneratedSlug(draft.slug);
                              setGeneratedBody(draft.htmlBody);
                              setPublishResult(null);
                            }}
                            className="rounded-lg border border-[rgba(255,170,170,0.45)] px-3 py-1.5 font-mono text-[11px] font-bold text-[rgba(255,230,230,0.96)] hover:bg-[rgba(255,170,170,0.12)] transition-colors"
                          >
                            Apply Full Suggested Draft
                          </button>
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <ConnectionModal
        open={activeModal !== null}
        platform={activeModal}
        initialValues={activeModal === 'webflow' ? {
          siteId: webflowSelection.siteId,
          collectionId: webflowSelection.collectionId,
        } : undefined}
        webflowSites={webflowSites}
        webflowCollections={webflowCollections}
        webflowLoadingOptions={webflowLoadingOptions}
        onWebflowSiteChange={(siteId) => {
          if (!siteId) return;
          void loadWebflowDiscovery(siteId);
        }}
        onClose={() => setActiveModal(null)}
        onSaveAndTest={handleSaveAndTest}
        onStartOAuth={handleStartOAuth}
      />
    </main>
  );
}
