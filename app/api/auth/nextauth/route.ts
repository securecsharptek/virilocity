// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — NextAuth v5 Route Handler
// Providers: Google OAuth2 · Microsoft Entra ID (Azure AD) · Magic Link Email
// ─────────────────────────────────────────────────────────────────────────────
import NextAuth from 'next-auth';
import Google   from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Resend   from 'next-auth/providers/resend';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env['AUTH_SECRET'],
  providers: [
    Google({
      clientId:     process.env['GOOGLE_CLIENT_ID']     ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),
    MicrosoftEntraID({
      clientId:     process.env['ENTRA_CLIENT_ID']     ?? '',
      clientSecret: process.env['ENTRA_CLIENT_SECRET'] ?? '',
      tenantId:     process.env['ENTRA_TENANT_ID']     ?? 'common',
    }),
    Resend({
      apiKey: process.env['RESEND_API_KEY'] ?? '',
      from:   'Virilocity <noreply@virilocity.io>',
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token['tenantId']) {
        (session as Record<string, unknown>)['tenantId'] = token['tenantId'];
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        // Production: look up or create tenant in Neon DB, attach tenantId to JWT
        token['tenantId'] = `tenant_${token['sub']?.slice(0, 12) ?? 'unknown'}`;
      }
      return token;
    },
  },
  pages: {
    signIn:  '/auth/login',
    signOut: '/auth/login',
    error:   '/auth/login',
  },
  session: { strategy: 'jwt' },
});

export const { GET, POST } = handlers;
