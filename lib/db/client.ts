// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Neon Postgres + Drizzle ORM Client
// Serverless-safe: new connection per request (Neon HTTP driver)
// ─────────────────────────────────────────────────────────────────────────────
import { neon }      from '@neondatabase/serverless';
import { drizzle }   from 'drizzle-orm/neon-http';
import * as schema   from './schema.js';

const sql = neon(process.env['DATABASE_URL'] ?? '');
export const db  = drizzle(sql, { schema });
export type DB   = typeof db;

// Re-export schema for co-located queries
export * from './schema.js';
