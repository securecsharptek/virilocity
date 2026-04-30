import type { Config } from 'drizzle-kit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const getDatabaseUrl = (): string => {
  if (process.env['DATABASE_URL']?.trim()) {
    return process.env['DATABASE_URL'];
  }

  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/^DATABASE_URL\s*=\s*(.+)$/m);
    if (!match || !match[1]) return '';

    const rawValue = match[1].trim();
    const unquoted = rawValue.replace(/^['"]|['"]$/g, '');
    return unquoted;
  } catch {
    return '';
  }
};

export default {
  schema:    './lib/db/schema.ts',
  out:       './infrastructure/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
} satisfies Config;
