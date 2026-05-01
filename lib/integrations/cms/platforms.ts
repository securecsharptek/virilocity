import { getSecret, getSecrets, setSecret } from '../../auth/keyvault';

export type CMSPlatformProvider = 'wordpress' | 'shopify' | 'webflow';

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

export const getCmsPlatformsStatus = async (tenantId: string): Promise<CMSPlatformStatus[]> => {
  const [wordpress, shopify, webflow] = await Promise.all([
    getWordPressStatus(tenantId),
    getShopifyStatus(tenantId),
    getWebflowStatus(tenantId),
  ]);

  return [wordpress, shopify, webflow];
};
