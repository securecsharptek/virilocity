// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — NextAuth v5 Route Handler
// Imports handlers from centralized auth.ts configuration
// ─────────────────────────────────────────────────────────────────────────────
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

