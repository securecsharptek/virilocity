// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Signup Page  ·  B2B/B2C  ·  WCAG 2.2
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import { signIn } from '@/auth';
import { PRICES, TIER_LIMITS } from '../../../lib/types/index';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Start your free Virilocity account — no credit card required.',
};

const TIER_LABELS: Record<string, string> = {
  free:'Free', starter:'Starter', pro:'Pro', growth:'Growth', scale:'Scale', enterprise:'Enterprise',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; model?: string }>;
}) {
  const params = await searchParams;
  const tier  = params.tier  ?? 'free';
  const model = params.model ?? 'b2c';
  const price = PRICES[tier as keyof typeof PRICES];
  const isB2B = model === 'b2b';

  return (
    <main id="main-content" className="min-h-screen bg-lgray flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        <div className="text-center mb-8">
          <a href="/" aria-label="Virilocity — return to homepage" className="text-navy font-bold text-2xl">
            <span aria-hidden="true">⚡</span> Virilocity
          </a>
          <h1 className="text-2xl font-bold text-navy mt-4">
            Start your {TIER_LABELS[tier] ?? 'Free'} {isB2B ? 'team' : ''} account
          </h1>
          {price && price.monthly > 0 && (
            <p className="text-slate-500 mt-1 text-sm">
              {isB2B ? `${TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.seats} seats included · ` : ''}
              ${price.monthly}/month · Cancel anytime
            </p>
          )}
          {(!price || price.monthly === 0) && tier !== 'enterprise' && (
            <p className="text-slate-500 mt-1 text-sm">Free forever · No credit card required</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-mgray p-8">
          {/* SSO first */}
          <div className="space-y-3 mb-6">
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/dashboard' });
              }}
            >
              <button
                type="submit"
                className="btn btn-primary w-full justify-center"
                aria-label="Sign up with Google"
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
                className="btn border border-mgray text-navy w-full justify-center hover:bg-lgray"
                aria-label="Sign up with Microsoft — recommended for B2B"
              >
                <span aria-hidden="true">M</span> Continue with Microsoft
                {isB2B && <span className="ml-2 text-xs bg-teal text-white px-2 py-0.5 rounded-full">Recommended for teams</span>}
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 mb-6" role="separator" aria-label="or email signup">
            <div className="flex-1 h-px bg-mgray" aria-hidden="true" />
            <span className="text-slate-400 text-sm">or</span>
            <div className="flex-1 h-px bg-mgray" aria-hidden="true" />
          </div>

          {/* Email + Name form */}
          <form method="POST" action="/api/auth/signup" noValidate>
            <input type="hidden" name="tier"  value={tier} />
            <input type="hidden" name="model" value={model} />

            <fieldset className="space-y-4">
              <legend className="sr-only">Account details</legend>

              {isB2B && (
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-slate-700 mb-1">
                    Organization name <span aria-label="required">*</span>
                  </label>
                  <input id="orgName" name="orgName" type="text" required
                    autoComplete="organization"
                    className="input" placeholder="Acme Corp" />
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
                  Full name <span aria-label="required">*</span>
                </label>
                <input id="fullName" name="fullName" type="text" required
                  autoComplete="name" className="input" placeholder="Jane Smith" />
              </div>

              <div>
                <label htmlFor="signupEmail" className="block text-sm font-medium text-slate-700 mb-1">
                  Work email <span aria-label="required">*</span>
                </label>
                <input id="signupEmail" name="email" type="email" required
                  autoComplete="email" className="input" placeholder="jane@company.com" />
              </div>

              <button type="submit" className="btn btn-secondary w-full justify-center">
                {tier === 'free' ? 'Create free account' : `Start ${TIER_LABELS[tier]} plan`}
              </button>
            </fieldset>
          </form>

          <p className="text-xs text-slate-400 text-center mt-4">
            By signing up you agree to our{' '}
            <a href="/terms" className="underline">Terms</a> and{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-teal font-medium underline">Sign in</a>
        </p>
      </div>
    </main>
  );
}
