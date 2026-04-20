// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — NextAuth v5 Root Config
// Required for Next.js App Router auth() server-side calls
// Providers: Google · Microsoft Entra ID · Resend Magic Link
// ─────────────────────────────────────────────────────────────────────────────
import NextAuth                 from 'next-auth';
import Google                   from 'next-auth/providers/google';
import MicrosoftEntraID         from 'next-auth/providers/microsoft-entra-id';
import Resend                   from 'next-auth/providers/resend';
import type { Session }         from 'next-auth';

interface ExtendedSession extends Session {
  tenantId?: string;
  orgId?:    string;
  tier?:     string;
  model?:    string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env['AUTH_SECRET'],

  providers: [
    Google({
      clientId:     process.env['GOOGLE_CLIENT_ID']     ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
      authorization: {
        params: { prompt: 'consent', access_type: 'offline', response_type: 'code' },
      },
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

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days

  callbacks: {
    async jwt({ token, account, profile, trigger, session }) {
      if (account) {
        // New sign-in: create or look up tenant
        // Production: upsert user + tenant in Neon DB
        const tenantId = `tenant_${(token['sub'] ?? 'anon').slice(0, 12)}`;
        token['tenantId'] = tenantId;
        token['tier']     = 'free';
        token['model']    = 'b2c';
        token['orgId']    = undefined;
      }
      // Handle session update (e.g. after tier upgrade)
      if (trigger === 'update' && session?.tier) {
        token['tier'] = session.tier;
      }
      return token;
    },

    async session({ session, token }): Promise<ExtendedSession> {
      return {
        ...session,
        tenantId: token['tenantId'] as string | undefined,
        orgId:    token['orgId']    as string | undefined,
        tier:     token['tier']     as string | undefined,
        model:    token['model']    as string | undefined,
      };
    },
  },

  pages: {
    signIn:  '/auth/login',
    signOut: '/auth/login',
    error:   '/auth/login',
    newUser: '/auth/signup',
  },

  events: {
    async signIn({ user, account }) {
      // Production: log sign-in event, update lastLoginAt in DB
    },
    async signOut({ token }) {
      // Production: invalidate any active sessions
    },
  },
});
