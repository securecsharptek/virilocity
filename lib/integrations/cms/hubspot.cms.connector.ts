import { getSecret } from '../../auth/keyvault';
import { CircuitBreaker, sleep } from '../../utils/index';

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

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const _cb = new CircuitBreaker(3, 30_000);
const HUBSPOT_RETRY_ATTEMPTS = 3;
const HUBSPOT_RETRY_BASE_DELAY_MS = 300;

class HubSpotApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(`HubSpot API rejected request (${status}): ${JSON.stringify(body)}`);
    this.name = 'HubSpotApiError';
  }

  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const injectSchemaJsonLd = (htmlBody: string, schemaJson?: Record<string, unknown>): string => {
  if (!schemaJson) return htmlBody;
  return `${htmlBody}\n<script type=\"application/ld+json\">${JSON.stringify(schemaJson)}</script>`;
};

const toHubSpotState = (status: HubSpotCMSPublishStatus): 'DRAFT' | 'PUBLISHED' => {
  return status === 'published' ? 'PUBLISHED' : 'DRAFT';
};

const getHubSpotCmsToken = async (tenantId: string): Promise<string> => {
  // Primary: OAuth access token stored by /api/hubspot/callback
  // Fallback: manual private-app token (legacy key)
  const token = (
    (await getSecret(`hubspot-access-${tenantId}`)) ||
    (await getSecret(`hs-cms-token-${tenantId}`))
  ).trim();
  if (!token) {
    throw new Error('HubSpot is not connected. Go to Settings → Integrations and connect HubSpot via OAuth first.');
  }
  return token;
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
          throw new HubSpotApiError(res.status, body);
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
      // 4xx auth/scope/config issues are not infrastructure failures.
      // Reset breaker so corrected credentials/scopes can recover immediately.
      _cb.reset();
      throw error;
    }

    if (error instanceof Error && error.message === 'Circuit breaker OPEN') {
      // The process can remain stuck after prior non-retryable failures.
      // Allow one immediate probe instead of forcing a process restart.
      _cb.reset();
      return _cb.call(executeRequest);
    }

    throw error;
  }
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

export const publishPost = async (
  tenantId: string,
  input: HubSpotCMSPublishInput,
): Promise<HubSpotCMSPublishResult> => {
  if (!tenantId || !input.title || !input.slug || !input.htmlBody) {
    throw new Error('tenantId, title, slug, and htmlBody are required');
  }

  const token = await getHubSpotCmsToken(tenantId);
  const status = input.status ?? 'published';
  const bodyHtml = injectSchemaJsonLd(input.htmlBody, input.schemaJson);

  const payload = {
    name: input.title,
    slug: input.slug,
    postBody: bodyHtml,
    state: toHubSpotState(status),
  };

  const existingId = await resolveExistingPostId(token, input.slug);

  if (existingId) {
    const updated = await requestHubSpot(
      token,
      `/cms/v3/blogs/posts/${encodeURIComponent(existingId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );

    const id = updated['id'];
    const postId = typeof id === 'string' || typeof id === 'number' ? String(id) : existingId;
    const url = typeof updated['url'] === 'string' ? updated['url'] : undefined;

    return {
      provider: 'hubspot',
      itemId: postId,
      status,
      url,
    };
  }

  const created = await requestHubSpot(
    token,
    '/cms/v3/blogs/posts',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  const createdId = created['id'];
  if (!(typeof createdId === 'string' || typeof createdId === 'number')) {
    throw new Error('HubSpot response missing post id');
  }

  const postId = String(createdId);

  if (status === 'published') {
    await requestHubSpot(
      token,
      `/cms/v3/blogs/posts/${encodeURIComponent(postId)}/publish-action`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'PUBLISH' }),
      },
    );
  }

  const url = typeof created['url'] === 'string' ? created['url'] : undefined;

  return {
    provider: 'hubspot',
    itemId: postId,
    status,
    url,
  };
};
