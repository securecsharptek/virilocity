// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Next.js Configuration
// Multicloud: Vercel Edge + self-hosted Docker
// ─────────────────────────────────────────────────────────────────────────────
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output for Docker self-hosted deployments
  output: 'standalone',

  // Experimental: Turbopack (dev), React Compiler
  experimental: {
    reactCompiler: true,
  },

  // Security headers — WCAG + OWASP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",   // Next.js requires unsafe-inline in dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://api.anthropic.com https://*.hubspot.com https://*.stripe.com",
              "font-src 'self' https://fonts.googleapis.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // WCAG: cache static assets but not dynamic pages
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Static assets — long cache
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // Image domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.virilocity.io' },
    ],
  },

  // Webpack — suppress punycode deprecation (node internals)
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, punycode: false };
    return config;
  },
};

export default nextConfig;
