// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — SAML 2.0 SSO (Enterprise Tier Only)
// SP metadata · AuthnRequest · ACS handler · SLO
// ─────────────────────────────────────────────────────────────────────────────
import { uid, now } from '../utils/index';

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';

export interface SAMLAssertion {
  nameId:     string;
  email:      string;
  attributes: Record<string, string>;
  redirectTo: string;
}

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

  // In production: use samlify or xmldsig for proper encoding
  const ssoUrl = `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}/saml2`;
  const params = new URLSearchParams({
    SAMLRequest: Buffer.from(`<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      ID="${requestId}" Version="2.0" IssueInstant="${issueInstant}"
      Destination="${ssoUrl}" AssertionConsumerServiceURL="${acsUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${entityId}</saml:Issuer>
    </samlp:AuthnRequest>`).toString('base64'),
    RelayState: `${tenantId}:${relayState}`,
  });

  return { redirectUrl: `${ssoUrl}?${params}`, requestId };
};

// ── ACS handler ───────────────────────────────────────────────────────────────
export const parseSAMLResponse = async (
  tenantId:     string,
  samlResponse: string,
  relayState?:  string,
): Promise<SAMLAssertion> => {
  // Production: use samlify to verify signature + extract assertion
  // Here: decode base64 and return mock assertion for scaffold
  const redirectTo = relayState?.split(':')[1] ?? '/dashboard';
  return {
    nameId:     `user@enterprise.com`,
    email:      `user@enterprise.com`,
    attributes: { displayName: 'Enterprise User', department: 'Marketing' },
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
