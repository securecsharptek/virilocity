// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.5 — LinkedIn Integration
// OAuth2 + member profile lookup + UGC post publishing
// ─────────────────────────────────────────────────────────────────────────────

const LINKEDIN_OAUTH_BASE = 'https://www.linkedin.com/oauth/v2';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

const getLinkedInRedirectUri = (): string => {
  const configured = (process.env['LINKEDIN_REDIRECT_URI'] ?? '').trim();
  if (configured) return configured;

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  return `${appUrl}/api/linkedin/callback`;
};

const LINKEDIN_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
].join(' ');

export class LinkedInAuth {
  static getAuthUrl(tenantId: string): string {
    const redirectUri = getLinkedInRedirectUri();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env['LINKEDIN_CLIENT_ID'] ?? '',
      redirect_uri: redirectUri,
      scope: LINKEDIN_SCOPES,
      state: tenantId,
    });

    return `${LINKEDIN_OAUTH_BASE}/authorization?${params.toString()}`;
  }

  static async exchangeCode(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const redirectUri = getLinkedInRedirectUri();

    const resp = await fetch(`${LINKEDIN_OAUTH_BASE}/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env['LINKEDIN_CLIENT_ID'] ?? '',
        client_secret: process.env['LINKEDIN_CLIENT_SECRET'] ?? '',
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(`LinkedIn token exchange failed: ${resp.status}${detail ? ` ${detail}` : ''}`);
    }

    const data = (await resp.json()) as Record<string, unknown>;

    return {
      accessToken: (data['access_token'] as string) ?? '',
      expiresIn: (data['expires_in'] as number) ?? 0,
    };
  }

  static async getMemberId(accessToken: string): Promise<string> {
    const resp = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(`LinkedIn userinfo lookup failed: ${resp.status}${detail ? ` ${detail}` : ''}`);
    }

    const data = (await resp.json()) as Record<string, unknown>;
    const sub = data['sub'];

    if (typeof sub !== 'string' || !sub.trim()) {
      throw new Error('LinkedIn userinfo response missing member id');
    }

    return sub;
  }
}

export class LinkedInPoster {
  static async postText(args: { accessToken: string; memberId: string; text: string }): Promise<{ id: string; status: number }> {
    const author = `urn:li:person:${args.memberId}`;

    const resp = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: args.text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      throw new Error(`LinkedIn publish failed: ${resp.status}${detail ? ` ${detail}` : ''}`);
    }

    const restliId = resp.headers.get('x-restli-id');
    const responseBody = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    const bodyId = typeof responseBody['id'] === 'string' ? responseBody['id'] : '';

    return {
      id: restliId || bodyId || `status-${resp.status}`,
      status: resp.status,
    };
  }
}
