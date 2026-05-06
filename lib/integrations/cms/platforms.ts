import { getSecret, getSecrets, setSecret } from '../../auth/keyvault';

export type CMSPlatformProvider = 'wordpress' | 'shopify' | 'webflow' | 'hubspot';

export interface WordPressCredentials {
  apiUrl: string;
  user: string;
  appPassword: string;
}

export interface CMSPlatformStatus {
  provider: CMSPlatformProvider;
  configured: boolean;
  connected: boolean;
  statusText: string;
  details?: string;
}

export interface WordPressVerificationResult {
  connected: boolean;
  statusCode?: number;
  details: string;
}

const toWordPressSecretNames = (tenantId: string) => ({
  apiUrl: `wordpress-api-url-${tenantId}`,
  user: `wordpress-user-${tenantId}`,
  appPassword: `wordpress-app-password-${tenantId}`,
});

const normalizeWordPressApiUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const buildWpUsersMeEndpoint = (apiUrl: string): string => {
  const normalized = normalizeWordPressApiUrl(apiUrl);
  return `${normalized}/wp-json/wp/v2/users/me`;
};

const toBasicAuthHeader = (user: string, appPassword: string): string => {
  const token = Buffer.from(`${user}:${appPassword}`, 'utf8').toString('base64');
  return `Basic ${token}`;
};

export const verifyWordPressCredentials = async (
  credentials: WordPressCredentials,
): Promise<WordPressVerificationResult> => {
  const endpoint = buildWpUsersMeEndpoint(credentials.apiUrl);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: toBasicAuthHeader(credentials.user, credentials.appPassword),
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  } catch (error) {
    return {
      connected: false,
      details: error instanceof Error ? error.message : 'WordPress network error',
    };
  }

  if (response.ok) {
    return {
      connected: true,
      statusCode: response.status,
      details: 'Connection verified',
    };
  }

  return {
    connected: false,
    statusCode: response.status,
    details: `WordPress rejected credentials (${response.status})`,
  };
};

export const connectWordPressPlatform = async (
  tenantId: string,
  credentials: WordPressCredentials,
): Promise<WordPressVerificationResult> => {
  const verification = await verifyWordPressCredentials(credentials);
  if (!verification.connected) return verification;

  const names = toWordPressSecretNames(tenantId);
  await Promise.all([
    setSecret(names.apiUrl, normalizeWordPressApiUrl(credentials.apiUrl)),
    setSecret(names.user, credentials.user.trim()),
    setSecret(names.appPassword, credentials.appPassword.trim()),
  ]);

  return verification;
};

const getWordPressStatus = async (tenantId: string): Promise<CMSPlatformStatus> => {
  const names = toWordPressSecretNames(tenantId);
  const credentials = await getSecrets([names.apiUrl, names.user, names.appPassword]);

  const apiUrl = credentials[names.apiUrl] ?? '';
  const user = credentials[names.user] ?? '';
  const appPassword = credentials[names.appPassword] ?? '';
  const configured = Boolean(apiUrl && user && appPassword);

  if (!configured) {
    return {
      provider: 'wordpress',
      configured: false,
      connected: false,
      statusText: 'Not Configured',
      details: 'Missing WP_API_URL, WP_USER, or WP_APP_PASSWORD',
    };
  }

  const verification = await verifyWordPressCredentials({ apiUrl, user, appPassword });
  if (!verification.connected) {
    return {
      provider: 'wordpress',
      configured: true,
      connected: false,
      statusText: 'Configured · Not Connected',
      details: verification.details,
    };
  }

  return {
    provider: 'wordpress',
    configured: true,
    connected: true,
    statusText: 'Connected',
    details: verification.details,
  };
};

const hasCmsProviderSecrets = async (
  tenantId: string,
  names: string[],
): Promise<boolean> => {
  const values = await Promise.all(names.map(name => getSecret(name).catch(() => '')));
  return values.every(value => Boolean(value));
};

const getShopifyStatus = async (tenantId: string): Promise<CMSPlatformStatus> => {
  const configured = await hasCmsProviderSecrets(tenantId, [
    `shopify-token-${tenantId}`,
    `shopify-shop-${tenantId}`,
    `shopify-blog-id-${tenantId}`,
  ]);

  return {
    provider: 'shopify',
    configured,
    connected: configured,
    statusText: configured ? 'Configured' : 'Not Configured',
  };
};

const getWebflowStatus = async (tenantId: string): Promise<CMSPlatformStatus> => {
  const configured = await hasCmsProviderSecrets(tenantId, [
    `webflow-token-${tenantId}`,
    `webflow-collection-${tenantId}`,
  ]);

  return {
    provider: 'webflow',
    configured,
    connected: configured,
    statusText: configured ? 'Configured' : 'Not Configured',
  };
};

const getHubSpotStatus = async (tenantId: string): Promise<CMSPlatformStatus> => {
  const oauthAccess = await getSecret(`hubspot-access-${tenantId}`).catch(() => '');
  const privateToken = await getSecret(`hs-cms-token-${tenantId}`).catch(() => '');
  const token = (oauthAccess || privateToken).trim();
  const configured = Boolean(token);

  if (!configured) {
    return {
      provider: 'hubspot',
      configured: false,
      connected: false,
      statusText: 'Not Configured',
      details: 'Connect HubSpot via OAuth or add a private app token',
    };
  }

  try {
    const configuredBlogId = (
      (process.env['HUBSPOT_BLOG_ID'] ?? '') ||
      (await getSecret(`hs-blog-id-${tenantId}`))
    ).trim();

    const endpoint = configuredBlogId
      ? `https://api.hubapi.com/cms/v3/blog-settings/settings/${encodeURIComponent(configuredBlogId)}`
      : 'https://api.hubapi.com/cms/v3/blog-settings/settings?limit=1&archived=false';

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const results = Array.isArray(data['results']) ? (data['results'] as Array<Record<string, unknown>>) : [];
      const blogId = configuredBlogId || String(results[0]?.['id'] ?? '');

      if (blogId) {
        await setSecret(`hs-blog-id-${tenantId}`, blogId);
        return {
          provider: 'hubspot',
          configured: true,
          connected: true,
          statusText: oauthAccess ? 'Connected via OAuth' : 'Configured',
        };
      }

      return {
        provider: 'hubspot',
        configured: true,
        connected: false,
        statusText: 'CMS setup required',
        details: 'HubSpot is connected, but no HubSpot blog exists yet. Create a blog in HubSpot CMS, then save its Blog Settings ID.',
      };
    }

    if (response.status === 404 && configuredBlogId) {
      return {
        provider: 'hubspot',
        configured: true,
        connected: false,
        statusText: 'Blog not found',
        details: 'The saved HubSpot Blog Settings ID was not found. Check the ID in HubSpot CMS settings.',
      };
    }

    if (response.status === 401) {
      return {
        provider: 'hubspot',
        configured: true,
        connected: false,
        statusText: 'Token expired',
        details: 'HubSpot token is invalid or expired. Reconnect HubSpot.',
      };
    }

    if (response.status === 403) {
      return {
        provider: 'hubspot',
        configured: true,
        connected: false,
        statusText: 'CMS scope missing',
        details: 'HubSpot permissions are insufficient for CMS publishing. Reconnect with content scope or add a CMS private app token.',
      };
    }

    return {
      provider: 'hubspot',
      configured: true,
      connected: false,
      statusText: 'CMS check failed',
      details: `HubSpot CMS check failed (${response.status})`,
    };
  } catch {
    return {
      provider: 'hubspot',
      configured: true,
      connected: false,
      statusText: 'CMS check failed',
      details: 'Network error while checking HubSpot CMS publishing readiness.',
    };
  }
};

export const getCmsPlatformsStatus = async (tenantId: string): Promise<CMSPlatformStatus[]> => {
  const [wordpress, shopify, webflow, hubspot] = await Promise.all([
    getWordPressStatus(tenantId),
    getShopifyStatus(tenantId),
    getWebflowStatus(tenantId),
    getHubSpotStatus(tenantId),
  ]);

  return [wordpress, shopify, webflow, hubspot];
};
