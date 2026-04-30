// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Login Page  ·  WCAG 2.2 compliant
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import Image from 'next/image';
import { signIn } from '@/auth';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Virilocity account.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main id="main-content" className="min-h-screen bg-lgray flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" aria-label="Virilocity — return to homepage"
            className="inline-block">
            <span
              className="relative flex items-center overflow-hidden rounded-2xl border border-[rgba(14,124,123,0.16)] bg-white shadow-[0_16px_40px_rgba(14,124,123,0.12)] ring-1 ring-[rgba(14,124,123,0.08)]"
              style={{ width: '340px', height: '72px' }}
            >
              <Image
                src="/assets/logos/VirilocityLogo.png"
                alt="Virilocity"
                fill
                priority
                sizes="340px"
                className="object-cover object-center"
              />
            </span>
          </a>
          <h1 className="text-2xl font-bold text-navy mt-4">Welcome back</h1>
          <p className="text-slate-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        {/* Error alert — WCAG 3.3.1 */}
        {params.error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {params.error === 'OAuthSignin' ? 'Authentication failed. Please try again.' : params.error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-mgray p-8">

          {/* Social SSO */}
          <div className="space-y-3">
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="btn btn-primary w-full justify-center gap-3"
                aria-label="Sign in with Google"
              >
                <span aria-hidden="true">G</span> Continue with Google
              </button>
            </form>
            <form
              action={async () => {
                'use server';
                await signIn('microsoft-entra-id', { redirectTo: '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="btn border border-mgray text-navy w-full justify-center gap-3 hover:bg-lgray"
                aria-label="Sign in with Microsoft Entra ID"
              >
                <span aria-hidden="true">M</span> Continue with Microsoft
              </button>
            </form>
          </div>

          {/* Divider — email login temporarily disabled */}
          {/* <div className="flex items-center gap-3 my-6" role="separator" aria-label="or">
            <div className="flex-1 h-px bg-mgray" aria-hidden="true" />
            <span className="text-slate-400 text-sm">or</span>
            <div className="flex-1 h-px bg-mgray" aria-hidden="true" />
          </div> */}

          {/* Email form — temporarily disabled */}
          {/* <form method="POST" action="/api/auth/signin/email" noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  aria-describedby="email-hint"
                  placeholder="you@company.com"
                />
                <p id="email-hint" className="text-xs text-slate-400 mt-1">
                  We'll send you a magic sign-in link
                </p>
              </div>

              <button type="submit" className="btn btn-secondary w-full justify-center">
                Send magic link
              </button>
            </div>
          </form> */}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <a href="/auth/signup" className="text-teal font-medium underline">
            Sign up free
          </a>
        </p>
      </div>
    </main>
  );
}
