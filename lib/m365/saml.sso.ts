// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML 2.0 SSO (Enterprise Tier Only)
// SP metadata · AuthnRequest · ACS handler · SLO
// ─────────────────────────────────────────────────────────────────────────────
import { createHmac } from 'node:crypto';
import { uid, now } from '../utils/index';

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';

export interface SAMLAssertion {
  nameId:     string;
  email:      string;
  attributes: Record<string, string>;
  redirectTo: string;
}

const SAML_REQUEST_TTL_MS = 5 * 60 * 1000;

const pendingRequests = new Map<string, { tenantId: string; relayState: string; createdAt: number }>();

const samlSecret = (): string => (process.env['AUTH_SECRET'] ?? 'dev-auth-secret').trim() || 'dev-auth-secret';

const signRelayPayload = (payload: string): string =>
  createHmac('sha256', samlSecret()).update(payload).digest('hex');

const parseRelayState = (relayState: string): {
  tenantId: string;
  redirectPath: string;
  ts: number;
  requestId: string;
  sig: string;
} | null => {
  const parts = relayState.split(':');
  if (parts.length !== 5) return null;

  const [tenantId, redirectPath, tsRaw, requestId, sig] = parts;
  if (!tenantId || !redirectPath || !tsRaw || !requestId || !sig) return null;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;

  return {
    tenantId,
    redirectPath,
    ts,
    requestId,
    sig,
  };
};

const safeRedirectPath = (raw: string): string => {
  if (!raw || !raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//')) return '/dashboard';
  return raw;
};

// ── SP Metadata XML ───────────────────────────────────────────────────────────
export const generateSPMetadata = async (tenantId: string): Promise<string> => {
  const entityId   = `${APP_URL}/saml/${tenantId}`;
  const acsUrl     = `${APP_URL}/api/auth/saml/acs`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}" index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
};

// ── AuthnRequest (SP-initiated) ───────────────────────────────────────────────
export const generateAuthnRequest = async (
  tenantId:    string,
  relayState:  string,
): Promise<{ redirectUrl: string; requestId: string }> => {
  const requestId = `_${uid('saml')}`;
  const issueInstant = now();
  const entityId = `${APP_URL}/saml/${tenantId}`;
  const acsUrl   = `${APP_URL}/api/auth/saml/acs`;
  const relayPath = safeRedirectPath(relayState);

  const relayTs = Date.now();
  const relayPayload = `${tenantId}:${relayPath}:${relayTs}:${requestId}`;
  const relaySig = signRelayPayload(relayPayload);
  const signedRelayState = `${relayPayload}:${relaySig}`;

  pendingRequests.set(requestId, {
    tenantId,
    relayState: signedRelayState,
    createdAt: relayTs,
  });

  // In production: use samlify or xmldsig for proper encoding
  const ssoUrl = `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}/saml2`;
  const params = new URLSearchParams({
    SAMLRequest: Buffer.from(`<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}"
      Destination="${ssoUrl}" AssertionConsumerServiceURL="${acsUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${entityId}</saml:Issuer>
    </samlp:AuthnRequest>`).toString('base64'),
    RelayState: signedRelayState,
  });

  return { redirectUrl: `${ssoUrl}?${params}`, requestId };
};

// ── ACS handler ───────────────────────────────────────────────────────────────
export const parseSAMLResponse = async (
  tenantId:     string,
  samlResponse: string,
  relayState?:  string,
): Promise<SAMLAssertion> => {
  if (!relayState) throw new Error('relay_state_missing');

  const relay = parseRelayState(relayState);
  if (!relay) throw new Error('relay_state_invalid');
  if (relay.tenantId !== tenantId) throw new Error('relay_tenant_mismatch');
  if (Date.now() - relay.ts > SAML_REQUEST_TTL_MS) throw new Error('relay_state_expired');

  const expectedSig = signRelayPayload(`${relay.tenantId}:${relay.redirectPath}:${relay.ts}:${relay.requestId}`);
  if (expectedSig !== relay.sig) throw new Error('relay_signature_mismatch');

  const pending = pendingRequests.get(relay.requestId);
  if (!pending) throw new Error('request_not_found');
  if (pending.tenantId !== tenantId) throw new Error('request_tenant_mismatch');
  if (pending.relayState !== relayState) throw new Error('request_relay_mismatch');
  if (Date.now() - pending.createdAt > SAML_REQUEST_TTL_MS) throw new Error('request_expired');

  let xml = '';
  try {
    xml = Buffer.from(samlResponse, 'base64').toString('utf8');
  } catch {
    throw new Error('response_base64_invalid');
  }

  if (!/<[^>]*Assertion/.test(xml) || !xml.includes('urn:oasis:names:tc:SAML:2.0:assertion')) {
    throw new Error('assertion_missing');
  }

  const inResponseTo = xml.match(/InResponseTo="([^"]+)"/)?.[1] ?? '';
  if (!inResponseTo || inResponseTo !== relay.requestId) {
    throw new Error('in_response_to_mismatch');
  }

  const nameId = xml.match(/<[^>]*NameID[^>]*>([^<]+)<\//)?.[1]?.trim() ?? '';
  const emailAttr = xml.match(/<[^>]*Attribute[^>]*Name="(?:email|Email|http:\/\/schemas\.xmlsoap\.org\/ws\/2005\/05\/identity\/claims\/emailaddress)"[^>]*>\s*<[^>]*AttributeValue[^>]*>([^<]+)<\//)?.[1]?.trim();
  const email = (emailAttr ?? nameId).trim();

  if (!nameId || !email) {
    throw new Error('identity_claims_missing');
  }

  pendingRequests.delete(relay.requestId);

  const redirectTo = safeRedirectPath(relay.redirectPath);
  return {
    nameId,
    email,
    attributes: { displayName: email.split('@')[0] ?? 'Enterprise User', department: 'Unknown' },
    redirectTo: `${APP_URL}${redirectTo}`,
  };
};

// ── SLO (Single Logout) ───────────────────────────────────────────────────────
export const generateLogoutRequest = async (
  tenantId: string,
  nameId:   string,
): Promise<{ redirectUrl: string }> => {
  const sloUrl = `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}/saml2`;
  return { redirectUrl: sloUrl };
};
