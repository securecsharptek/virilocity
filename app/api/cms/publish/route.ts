import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { runAgentCall } from '../../../../lib/ai/client';
import {
  CMSIntegrationError,
  type CMSProvider,
  type CMSPublishStatus,
  publishCMSContent,
} from '../../../../lib/integrations/cms';
import type { Tier } from '../../../../lib/types/index';

export const runtime = 'nodejs';

type PublishPayload = {
  provider?: CMSProvider;
  platform?: CMSProvider;
  title?: string;
  slug?: string;
  htmlBody?: string;
  status?: CMSPublishStatus;
  schemaJson?: Record<string, unknown>;
};

type ReviewSuggestion = {
  title: string;
  slug: string;
  htmlBody: string;
};

type ReviewDetails = {
  agentType: 'brand_voice_enforcer + seo_auditor';
  score: number | null;
  brandScore: number | null;
  seoScore: number | null;
  reasons: string[];
  summary: string;
  recommendations: string[];
  suggestedDraft: ReviewSuggestion | null;
};

type CmsSession = {
  tenantId?: string;
  user?: { email?: string | null };
} | null;

const tenantIdFromSession = (session: CmsSession): string | null => {
  if (session?.tenantId) return session.tenantId;
  if (session?.user?.email) return `tenant_${session.user.email}`;
  return null;
};

const resolveTenant = async (req: NextRequest): Promise<{ tenantId: string; tier: Tier } | { errorResponse: NextResponse }> => {
  const authHeader = req.headers.get('authorization');
  const hasBearerToken = typeof authHeader === 'string' && /^Bearer\s+\S+$/i.test(authHeader.trim());

  if (hasBearerToken) {
    const bearerAuth = await authenticate(authHeader);
    if (!bearerAuth.ok) {
      const [status, body] = authErrorToHttp(bearerAuth.error);
      return { errorResponse: NextResponse.json(body, { status }) };
    }

    return { tenantId: bearerAuth.ctx.tenant.id, tier: bearerAuth.ctx.tenant.tier };
  }

  let session: CmsSession;
  try {
    session = (await auth()) as CmsSession;
  } catch {
    session = null;
  }

  const tenantId = tenantIdFromSession(session);
  if (!tenantId) {
    return { errorResponse: NextResponse.json({ error: 'Authorization header required' }, { status: 401 }) };
  }

  return { tenantId, tier: 'free' };
};

const parseAgentJson = (value: string): Record<string, unknown> | null => {
  const normalized = value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const candidates = [normalized];
  const objectMatch = normalized.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0] !== normalized) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      continue;
    }
  }

  return null;
};

const stripHtml = (value: string): string => value
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toSlug = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const toStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => String(item ?? '').trim())
    .filter(item => item.length > 0);
};

const pickScore = (
  parsed: Record<string, unknown> | null,
  keys: string[],
): number | null => {
  for (const key of keys) {
    const raw = Number(parsed?.[key]);
    if (Number.isFinite(raw)) return raw;
  }
  return null;
};

const mergeUnique = (left: string[], right: string[], maxItems: number): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of [...left, ...right]) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= maxItems) break;
  }

  return out;
};

const toReviewDetails = (
  brandParsed: Record<string, unknown> | null,
  seoParsed: Record<string, unknown> | null,
  payload: PublishPayload,
): ReviewDetails => {
  const brandScore = pickScore(brandParsed, ['brandConsistencyScore']);
  const seoScore = pickScore(seoParsed, ['seoScore', 'optimizationScore', 'overallScore']);
  const combinedScore = brandScore !== null && seoScore !== null
    ? Math.round((brandScore + seoScore) / 2)
    : (brandScore ?? seoScore ?? null);

  const brandReasons = [
    ...toStringList(brandParsed?.['flags']),
    ...toStringList(brandParsed?.['flagged']),
    ...toStringList(brandParsed?.['violations']),
  ];
  const seoReasons = [
    ...toStringList(seoParsed?.['seoIssues']),
    ...toStringList(seoParsed?.['issues']),
    ...toStringList(seoParsed?.['flags']),
  ];
  const reasons = mergeUnique(brandReasons, seoReasons, 6);

  const brandRecommendations = [
    ...toStringList(brandParsed?.['recommendations']),
    ...toStringList(brandParsed?.['fixes']),
    ...toStringList(brandParsed?.['suggestions']),
  ];
  const seoRecommendations = [
    ...toStringList(seoParsed?.['recommendations']),
    ...toStringList(seoParsed?.['fixes']),
    ...toStringList(seoParsed?.['nextActions']),
  ];
  const recommendations = mergeUnique(brandRecommendations, seoRecommendations, 6);

  const brandSummary = typeof brandParsed?.['summary'] === 'string' ? brandParsed['summary'].trim() : '';
  const seoSummary = typeof seoParsed?.['summary'] === 'string' ? seoParsed['summary'].trim() : '';
  const summary = [brandSummary, seoSummary].filter(Boolean).join(' | ') || 'Content needs improvements before publishing.';

  const suggestedTitleRaw = typeof seoParsed?.['suggestedTitle'] === 'string'
    ? seoParsed['suggestedTitle'].trim()
    : (typeof brandParsed?.['suggestedTitle'] === 'string'
        ? brandParsed['suggestedTitle'].trim()
        : (typeof brandParsed?.['revisedTitle'] === 'string' ? brandParsed['revisedTitle'].trim() : ''));
  const suggestedTitle = suggestedTitleRaw || (payload.title ?? '').trim();

  const suggestedSlugRaw = typeof seoParsed?.['suggestedSlug'] === 'string'
    ? seoParsed['suggestedSlug'].trim()
    : (typeof brandParsed?.['suggestedSlug'] === 'string'
        ? brandParsed['suggestedSlug'].trim()
        : (typeof brandParsed?.['revisedSlug'] === 'string' ? brandParsed['revisedSlug'].trim() : ''));
  const slugSeed = suggestedTitle || (payload.slug ?? '');
  const suggestedSlug = suggestedSlugRaw || toSlug(slugSeed);

  const suggestedBody = typeof seoParsed?.['suggestedBodyHtml'] === 'string'
    ? seoParsed['suggestedBodyHtml'].trim()
    : (typeof brandParsed?.['suggestedBodyHtml'] === 'string'
        ? brandParsed['suggestedBodyHtml'].trim()
        : (typeof brandParsed?.['revisedBodyHtml'] === 'string' ? brandParsed['revisedBodyHtml'].trim() : ''));

  const hasMeaningfulSuggestion = suggestedTitle.length > 0 && suggestedSlug.length > 0 && suggestedBody.length > 0;

  return {
    agentType: 'brand_voice_enforcer + seo_auditor',
    score: combinedScore,
    brandScore,
    seoScore,
    reasons,
    summary,
    recommendations,
    suggestedDraft: hasMeaningfulSuggestion
      ? {
          title: suggestedTitle,
          slug: suggestedSlug,
          htmlBody: suggestedBody,
        }
      : null,
  };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenantResolution = await resolveTenant(req);
  if ('errorResponse' in tenantResolution) return tenantResolution.errorResponse;

  const payload = await req.json() as PublishPayload;

  const provider = payload.provider ?? payload.platform;
  const ALLOWED_PROVIDERS = ['shopify', 'webflow', 'wordpress', 'hubspot'] as const;
  if (!provider || !(ALLOWED_PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json({
      ok: false,
      error: {
        provider: provider ?? 'unknown',
        code: 'invalid_payload',
        message: 'provider/platform must be one of: shopify, webflow, wordpress, hubspot',
        retryable: false,
      },
    }, { status: 400 });
  }

  try {
    const contentText = stripHtml(payload.htmlBody ?? '').slice(0, 6000);

    const brandReview = await runAgentCall(
      'brand_voice_enforcer',
      tenantResolution.tier,
      'You are a strict marketing content reviewer for publish readiness. Return JSON only with keys: approved (boolean), brandConsistencyScore (0-100), summary (string), flags (string[]), seoIssues (string[]), recommendations (string[]), suggestedTitle (string), suggestedSlug (string), suggestedBodyHtml (string).',
      JSON.stringify({
        channel: 'cms',
        title: payload.title ?? '',
        content: contentText,
      }),
    );

    const seoReview = await runAgentCall(
      'seo_auditor',
      tenantResolution.tier,
      'You are an SEO reviewer for blog publish readiness. Return JSON only with keys: approved (boolean), seoScore (0-100), summary (string), seoIssues (string[]), recommendations (string[]), suggestedTitle (string), suggestedSlug (string), suggestedBodyHtml (string).',
      JSON.stringify({
        title: payload.title ?? '',
        slug: payload.slug ?? '',
        content: contentText,
      }),
    );

    const brandParsed = parseAgentJson(brandReview.output);
    const seoParsed = parseAgentJson(seoReview.output);
    const reviewDetails = toReviewDetails(brandParsed, seoParsed, payload);

    const brandFlags = [
      ...toStringList(brandParsed?.['flags']),
      ...toStringList(brandParsed?.['flagged']),
      ...toStringList(brandParsed?.['violations']),
    ];
    const seoFlags = [
      ...toStringList(seoParsed?.['seoIssues']),
      ...toStringList(seoParsed?.['issues']),
      ...toStringList(seoParsed?.['flags']),
    ];

    const brandRejected = brandParsed?.['approved'] === false
      || brandFlags.length > 0
      || (reviewDetails.brandScore !== null && reviewDetails.brandScore < 70);
    const seoRejected = seoParsed?.['approved'] === false
      || seoFlags.length > 0
      || (reviewDetails.seoScore !== null && reviewDetails.seoScore < 70);
    const rejected = brandRejected || seoRejected;

    if (rejected) {
      return NextResponse.json({
        ok: false,
        error: {
          provider,
          code: 'blocked_by_ai_review',
          message: 'Publish blocked by AI review. Apply suggestions and retry.',
          retryable: true,
          review: reviewDetails,
        },
      }, { status: 409 });
    }
  } catch {
    // Fail-open: avoid hard publish outage if reviewer call is unavailable.
  }

  try {
    const result = await publishCMSContent({
      tenantId: tenantResolution.tenantId,
      provider,
      title: payload.title ?? '',
      slug: payload.slug ?? '',
      htmlBody: payload.htmlBody ?? '',
      status: payload.status,
      schemaJson: payload.schemaJson,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    if (error instanceof CMSIntegrationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.payload,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          provider,
          code: 'unknown',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      },
      { status: 500 },
    );
  }
}
