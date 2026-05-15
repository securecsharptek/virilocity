import { getSecret, setSecret } from '../../auth/keyvault';
import { CircuitBreaker, sleep } from '../../utils/index';
import { HubSpotAuth } from '../hubspot';

export type HubSpotCMSPublishStatus = 'draft' | 'published';

export interface HubSpotCMSPublishInput {
  title: string;
  slug: string;
  htmlBody: string;
  schemaJson?: Record<string, unknown>;
  status?: HubSpotCMSPublishStatus;
}

export interface HubSpotCMSPublishResult {
  provider: 'hubspot';
  itemId: string;
  status: HubSpotCMSPublishStatus;
  url?: string;
}

type HubSpotTokenSource = 'oauth' | 'private-app';

interface HubSpotTokenBundle {
  accessToken: string;
  refreshToken: string;
  source: HubSpotTokenSource;
}

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const _cb = new CircuitBreaker(3, 30_000);
const HUBSPOT_RETRY_ATTEMPTS = 3;
const HUBSPOT_RETRY_BASE_DELAY_MS = 300;

class HubSpotApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
    public readonly endpoint: string,
  ) {
    super(`HubSpot API rejected request (${status}) for ${endpoint}: ${JSON.stringify(body)}`);
    this.name = 'HubSpotApiError';
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const injectSchemaJsonLd = (htmlBody: string, schemaJson?: Record<string, unknown>): string => {
  if (!schemaJson) return htmlBody;
  return `${htmlBody}\n<script type="application/ld+json">${JSON.stringify(schemaJson)}</script>`;
};

const toHubSpotState = (status: HubSpotCMSPublishStatus): 'DRAFT' | 'PUBLISHED' => {
  return status === 'published' ? 'PUBLISHED' : 'DRAFT';
};

const getId = (value: unknown): string | null => {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
};

const getHubSpotTokenBundle = async (tenantId: string): Promise<HubSpotTokenBundle> => {
  const oauthAccessToken = (await getSecret(`hubspot-access-${tenantId}`)).trim();
  if (oauthAccessToken) {
    return {
      accessToken: oauthAccessToken,
      refreshToken: (await getSecret(`hubspot-refresh-${tenantId}`)).trim(),
      source: 'oauth',
    };
  }

  const privateAppToken = (await getSecret(`hs-cms-token-${tenantId}`)).trim();
  if (!privateAppToken) {
    throw new Error('HubSpot is not connected. Go to Settings -> Integrations and connect HubSpot via OAuth first.');
  }

  return {
    accessToken: privateAppToken,
    refreshToken: '',
    source: 'private-app',
  };
};

const getConfiguredBlogId = async (tenantId: string): Promise<string> => {
  const fromEnv = (process.env['HUBSPOT_BLOG_ID'] ?? '').trim();
  if (fromEnv) return fromEnv;
  return (await getSecret(`hs-blog-id-${tenantId}`)).trim();
};

const getConfiguredSeedPostId = (): string => {
  return (process.env['HUBSPOT_BLOG_POST_ID'] ?? '').trim();
};

const getConfiguredAuthorId = async (tenantId: string): Promise<string> => {
  const fromEnv = (process.env['HUBSPOT_BLOG_AUTHOR_ID'] ?? '').trim();
  if (fromEnv) return fromEnv;
  return (await getSecret(`hs-blog-author-id-${tenantId}`)).trim();
};

const parseResponse = async (res: Response): Promise<Record<string, unknown>> => {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw };
  }
};

const requestHubSpot = async (
  token: string,
  endpoint: string,
  init: RequestInit,
): Promise<Record<string, unknown>> => {
  const executeRequest = async (): Promise<Record<string, unknown>> => {
    let lastErr: unknown;

    for (let attempt = 0; attempt < HUBSPOT_RETRY_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(`${HUBSPOT_API_BASE}${endpoint}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          const body = await parseResponse(res);
          throw new HubSpotApiError(res.status, body, endpoint);
        }

        return parseResponse(res);
      } catch (error) {
        lastErr = error;

        const retryable = !(error instanceof HubSpotApiError) || error.retryable;
        if (!retryable || attempt === HUBSPOT_RETRY_ATTEMPTS - 1) {
          throw error;
        }

        await sleep(HUBSPOT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastErr;
  };

  try {
    return await _cb.call(executeRequest);
  } catch (error) {
    if (error instanceof HubSpotApiError && !error.retryable) {
      _cb.reset();
      throw error;
    }

    if (error instanceof Error && error.message === 'Circuit breaker OPEN') {
      _cb.reset();
      return _cb.call(executeRequest);
    }

    throw error;
  }
};

const resolveBlogId = async (token: string, tenantId: string): Promise<string> => {
  const configuredBlogId = await getConfiguredBlogId(tenantId);
  if (configuredBlogId) {
    return configuredBlogId;
  }

  const seedPostId = getConfiguredSeedPostId();
  if (seedPostId) {
    try {
      const post = await requestHubSpot(
        token,
        `/cms/v3/blogs/posts/${encodeURIComponent(seedPostId)}`,
        { method: 'GET' },
      );
      const blogId = getId(post['contentGroupId']);
      if (blogId) {
        await setSecret(`hs-blog-id-${tenantId}`, blogId);
        return blogId;
      }
    } catch (error) {
      // Seed post IDs can become stale; continue with blog settings discovery.
      if (!(error instanceof HubSpotApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const data = await requestHubSpot(
    token,
    '/cms/v3/blog-settings/settings?limit=1&archived=false',
    { method: 'GET' },
  );

  const results = Array.isArray(data['results']) ? (data['results'] as Array<Record<string, unknown>>) : [];
  const blogId = getId(results[0]?.['id']);
  if (!blogId) {
    throw new Error('HubSpot CMS publish is blocked: no HubSpot blog was found. Create a HubSpot blog first, then open HubSpot CMS settings in this app and save the HubSpot Blog Settings ID.');
  }

  await setSecret(`hs-blog-id-${tenantId}`, blogId);
  return blogId;
};

const resolveAuthorId = async (token: string, tenantId: string): Promise<string> => {
  const configuredAuthorId = await getConfiguredAuthorId(tenantId);
  if (configuredAuthorId) {
    return configuredAuthorId;
  }

  const data = await requestHubSpot(
    token,
    '/cms/v3/blogs/authors?limit=1&archived=false',
    { method: 'GET' },
  );

  const results = Array.isArray(data['results']) ? (data['results'] as Array<Record<string, unknown>>) : [];
  const authorId = getId(results[0]?.['id']);
  if (!authorId) {
    throw new Error('HubSpot CMS publish is blocked: no HubSpot blog author was found. Create a blog author in HubSpot, or set HUBSPOT_BLOG_AUTHOR_ID to an existing author ID.');
  }

  await setSecret(`hs-blog-author-id-${tenantId}`, authorId);
  return authorId;
};

const toMetaDescription = (title: string, htmlBody: string): string => {
  const text = htmlBody
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (text || title).slice(0, 155);
};

const resolveExistingPostId = async (token: string, slug: string): Promise<string | null> => {
  const data = await requestHubSpot(
    token,
    `/cms/v3/blogs/posts?limit=1&slug=${encodeURIComponent(slug)}`,
    { method: 'GET' },
  );

  const results = Array.isArray(data['results']) ? (data['results'] as Array<Record<string, unknown>>) : [];
  const first = results[0];
  if (!first) return null;
  const id = first['id'];
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
};

const toErrorText = (body: Record<string, unknown>): string => {
  const message = typeof body['message'] === 'string' ? body['message'] : '';
  const category = typeof body['category'] === 'string' ? body['category'] : '';
  const errors = Array.isArray(body['errors']) ? JSON.stringify(body['errors']) : '';
  return `${message} ${category} ${errors}`.toLowerCase();
};

const isLikelySlugConflict = (error: HubSpotApiError): boolean => {
  if (error.status !== 409 && error.status !== 400) return false;
  const text = toErrorText(error.body);
  return /slug/.test(text) && /exist|duplicate|conflict|taken|already/.test(text);
};

const isLikelyCmsScopeError = (error: HubSpotApiError): boolean => {
  if (error.status !== 403) return false;
  const text = toErrorText(error.body);
  return /scope|permission|forbidden|missing|unauthorized|content/.test(text);
};

const toCmsScopeError = (): Error => {
  return new Error('HubSpot CMS publish is blocked: OAuth token is missing CMS scope. Reconnect via /api/hubspot/auth?includeContentScope=true after enabling content scope in HubSpot app settings, or provide a HubSpot private app CMS token.');
};

const runPublishOperation = async (
  accessToken: string,
  tenantId: string,
  input: HubSpotCMSPublishInput,
  status: HubSpotCMSPublishStatus,
): Promise<HubSpotCMSPublishResult> => {
  const bodyHtml = injectSchemaJsonLd(input.htmlBody, input.schemaJson);
  const blogId = await resolveBlogId(accessToken, tenantId);
  const authorId = await resolveAuthorId(accessToken, tenantId);
  const payload = {
    name: input.title,
    contentGroupId: blogId,
    slug: input.slug,
    blogAuthorId: authorId,
    htmlTitle: input.title,
    metaDescription: toMetaDescription(input.title, input.htmlBody),
    useFeaturedImage: false,
    postBody: bodyHtml,
    state: toHubSpotState(status),
  };

  const toResult = (response: Record<string, unknown>, fallbackId?: string): HubSpotCMSPublishResult => {
    const id = response['id'];
    const postId = typeof id === 'string' || typeof id === 'number' ? String(id) : fallbackId;
    if (!postId) {
      throw new Error('HubSpot response missing post id');
    }

    const url = typeof response['url'] === 'string' ? response['url'] : undefined;
    return {
      provider: 'hubspot',
      itemId: postId,
      status,
      url,
    };
  };

  const publishIfNeeded = async (postId: string): Promise<void> => {
    if (status !== 'published') return;
    await requestHubSpot(
      accessToken,
      `/cms/v3/blogs/posts/${encodeURIComponent(postId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ state: 'PUBLISHED' }),
      },
    );
  };

  const createPost = async (): Promise<HubSpotCMSPublishResult> => {
    const created = await requestHubSpot(
      accessToken,
      '/cms/v3/blogs/posts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    const result = toResult(created);
    await publishIfNeeded(result.itemId);
    return result;
  };

  const existingId = await resolveExistingPostId(accessToken, input.slug);

  if (existingId) {
    try {
      const updated = await requestHubSpot(
        accessToken,
        `/cms/v3/blogs/posts/${encodeURIComponent(existingId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      const result = toResult(updated, existingId);
      await publishIfNeeded(result.itemId);
      return result;
    } catch (error) {
      if (!(error instanceof HubSpotApiError) || error.status !== 404) {
        throw error;
      }

      // HubSpot can return stale IDs in slug search; recover by creating a fresh post.
      try {
        return await createPost();
      } catch (createError) {
        if (createError instanceof HubSpotApiError && isLikelySlugConflict(createError)) {
          const refreshedId = await resolveExistingPostId(accessToken, input.slug);
          if (refreshedId && refreshedId !== existingId) {
            const refreshed = await requestHubSpot(
              accessToken,
              `/cms/v3/blogs/posts/${encodeURIComponent(refreshedId)}`,
              {
                method: 'PATCH',
                body: JSON.stringify(payload),
              },
            );

            const result = toResult(refreshed, refreshedId);
            await publishIfNeeded(result.itemId);
            return result;
          }
        }

        throw createError;
      }
    }
  }

  return createPost();
};

const withHubSpotAuthFallback = async (
  tenantId: string,
  bundle: HubSpotTokenBundle,
  input: HubSpotCMSPublishInput,
  status: HubSpotCMSPublishStatus,
): Promise<HubSpotCMSPublishResult> => {
  try {
    return await runPublishOperation(bundle.accessToken, tenantId, input, status);
  } catch (error) {
    if (!(error instanceof HubSpotApiError)) {
      throw error;
    }

    if (isLikelyCmsScopeError(error)) {
      if (bundle.source === 'oauth') {
        const privateAppToken = (await getSecret(`hs-cms-token-${tenantId}`)).trim();
        if (privateAppToken && privateAppToken !== bundle.accessToken) {
          try {
            return await runPublishOperation(privateAppToken, tenantId, input, status);
          } catch (fallbackError) {
            if (fallbackError instanceof HubSpotApiError && isLikelyCmsScopeError(fallbackError)) {
              throw toCmsScopeError();
            }
            throw fallbackError;
          }
        }
      }

      throw toCmsScopeError();
    }

    const canRefresh = bundle.source === 'oauth' && error.status === 401 && bundle.refreshToken;
    if (!canRefresh) {
      throw error;
    }

    const refreshed = await HubSpotAuth.refreshToken(bundle.refreshToken);
    await setSecret(`hubspot-access-${tenantId}`, refreshed.accessToken);
    return runPublishOperation(refreshed.accessToken, tenantId, input, status);
  }
};

export const publishPost = async (
  tenantId: string,
  input: HubSpotCMSPublishInput,
): Promise<HubSpotCMSPublishResult> => {
  if (!tenantId || !input.title || !input.slug || !input.htmlBody) {
    throw new Error('tenantId, title, slug, and htmlBody are required');
  }

  const tokenBundle = await getHubSpotTokenBundle(tenantId);
  const status = input.status ?? 'published';
  return withHubSpotAuthFallback(tenantId, tokenBundle, input, status);
};
