import { getSecret } from '../../auth/keyvault';

export type CMSProvider = 'shopify' | 'webflow';

export type CMSPublishStatus = 'draft' | 'published';

export interface CMSPublishInput {
  tenantId: string;
  provider: CMSProvider;
  title: string;
  slug: string;
  htmlBody: string;
  status?: CMSPublishStatus;
  schemaJson?: Record<string, unknown>;
}

export interface CMSPublishResult {
  provider: CMSProvider;
  itemId: string;
  url?: string;
  status: CMSPublishStatus;
}

export interface CMSProviderError {
  provider: CMSProvider;
  code:
    | 'invalid_payload'
    | 'missing_credentials'
    | 'request_failed'
    | 'upstream_rejected'
    | 'network_error'
    | 'unknown';
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export class CMSIntegrationError extends Error {
  public readonly status: number;
  public readonly payload: CMSProviderError;

  constructor(status: number, payload: CMSProviderError) {
    super(payload.message);
    this.name = 'CMSIntegrationError';
    this.status = status;
    this.payload = payload;
  }
}

type ShopifyCreds = {
  token: string;
  shop: string;
  blogId: string;
};

type WebflowCreds = {
  token: string;
  collectionId: string;
};

const SHOPIFY_API_VERSION = '2024-10';

const asStructuredError = (
  provider: CMSProvider,
  message: string,
  code: CMSProviderError['code'] = 'unknown',
  retryable = false,
  details?: Record<string, unknown>,
): CMSIntegrationError => {
  return new CMSIntegrationError(code === 'invalid_payload' || code === 'missing_credentials' ? 400 : 502, {
    provider,
    code,
    message,
    retryable,
    details,
  });
};

const injectSchemaJsonLd = (
  htmlBody: string,
  schemaJson?: Record<string, unknown>,
): string => {
  if (!schemaJson) return htmlBody;

  const json = JSON.stringify(schemaJson);
  const script = `<script type="application/ld+json">${json}</script>`;
  return `${htmlBody}\n${script}`;
};

const loadShopifyCreds = async (tenantId: string): Promise<ShopifyCreds> => {
  const [token, shop, blogId] = await Promise.all([
    getSecret(`shopify-token-${tenantId}`),
    getSecret(`shopify-shop-${tenantId}`),
    getSecret(`shopify-blog-id-${tenantId}`),
  ]);

  if (!token || !shop || !blogId) {
    throw asStructuredError('shopify', 'Missing Shopify credentials in Key Vault', 'missing_credentials', false, {
      expectedSecrets: ['shopify-token-{tenantId}', 'shopify-shop-{tenantId}', 'shopify-blog-id-{tenantId}'],
    });
  }

  return { token, shop, blogId };
};

const loadWebflowCreds = async (tenantId: string): Promise<WebflowCreds> => {
  const [token, collectionId] = await Promise.all([
    getSecret(`webflow-token-${tenantId}`),
    getSecret(`webflow-collection-${tenantId}`),
  ]);

  if (!token || !collectionId) {
    throw asStructuredError('webflow', 'Missing Webflow credentials in Key Vault', 'missing_credentials', false, {
      expectedSecrets: ['webflow-token-{tenantId}', 'webflow-collection-{tenantId}'],
    });
  }

  return { token, collectionId };
};

const publishToShopify = async (input: CMSPublishInput): Promise<CMSPublishResult> => {
  const creds = await loadShopifyCreds(input.tenantId);
  const bodyHtml = injectSchemaJsonLd(input.htmlBody, input.schemaJson);

  const endpoint = `https://${creds.shop}/admin/api/${SHOPIFY_API_VERSION}/blogs/${creds.blogId}/articles.json`;
  const publishNow = (input.status ?? 'published') === 'published';

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': creds.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        article: {
          title: input.title,
          body_html: bodyHtml,
          handle: input.slug,
          published: publishNow,
        },
      }),
    });
  } catch (error) {
    throw asStructuredError('shopify', 'Shopify request failed', 'network_error', true, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw asStructuredError('shopify', `Shopify rejected publish request (${response.status})`, 'upstream_rejected', response.status >= 500, {
      status: response.status,
      body: data,
    });
  }

  const article = data['article'] as Record<string, unknown> | undefined;
  const itemId = String(article?.['id'] ?? '');
  if (!itemId) {
    throw asStructuredError('shopify', 'Shopify response missing article id', 'request_failed', false, {
      body: data,
    });
  }

  return {
    provider: 'shopify',
    itemId,
    url: typeof article?.['admin_graphql_api_id'] === 'string' ? article['admin_graphql_api_id'] : undefined,
    status: publishNow ? 'published' : 'draft',
  };
};

const publishToWebflow = async (input: CMSPublishInput): Promise<CMSPublishResult> => {
  const creds = await loadWebflowCreds(input.tenantId);
  const bodyHtml = injectSchemaJsonLd(input.htmlBody, input.schemaJson);
  const publishNow = (input.status ?? 'published') === 'published';

  const endpoint = `https://api.webflow.com/v2/collections/${creds.collectionId}/items`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isArchived: false,
        isDraft: !publishNow,
        fieldData: {
          name: input.title,
          slug: input.slug,
          'post-body': bodyHtml,
        },
      }),
    });
  } catch (error) {
    throw asStructuredError('webflow', 'Webflow request failed', 'network_error', true, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw asStructuredError('webflow', `Webflow rejected publish request (${response.status})`, 'upstream_rejected', response.status >= 500, {
      status: response.status,
      body: data,
    });
  }

  const item = data as Record<string, unknown>;
  const itemId = String(item['id'] ?? item['_id'] ?? '');
  if (!itemId) {
    throw asStructuredError('webflow', 'Webflow response missing item id', 'request_failed', false, {
      body: data,
    });
  }

  const url = typeof item['lastPublishedUrl'] === 'string' ? item['lastPublishedUrl'] : undefined;
  return {
    provider: 'webflow',
    itemId,
    url,
    status: publishNow ? 'published' : 'draft',
  };
};

export const publishCMSContent = async (input: CMSPublishInput): Promise<CMSPublishResult> => {
  if (!input.tenantId || !input.title || !input.slug || !input.htmlBody) {
    throw asStructuredError(input.provider, 'tenantId, title, slug, and htmlBody are required', 'invalid_payload', false);
  }

  if (input.provider === 'shopify') return publishToShopify(input);
  if (input.provider === 'webflow') return publishToWebflow(input);

  throw asStructuredError(input.provider, `Unsupported provider: ${input.provider}`, 'invalid_payload', false);
};
