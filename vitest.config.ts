import { defineConfig, Plugin } from 'vitest/config';
import path from 'path';
import fs   from 'fs';

// Resolve TypeScript .js imports to the actual .ts source files
const resolveJsToTs: Plugin = {
  name: 'resolve-js-to-ts',
  resolveId(id, importer) {
    if (!importer) return null;
    if (!id.startsWith('.') && !id.startsWith('/')) return null;
    if (!id.endsWith('.js')) return null;

    const base    = id.slice(0, -3); // strip .js
    const dir     = path.dirname(importer);
    const tsPath  = path.resolve(dir, base + '.ts');
    const tsxPath = path.resolve(dir, base + '.tsx');

    if (fs.existsSync(tsPath))  return tsPath;
    if (fs.existsSync(tsxPath)) return tsxPath;
    return null;
  },
};

export default defineConfig({
  plugins: [resolveJsToTs],
  test: {
    environment: 'node',
    globals:     false,
    setupFiles:  ['./tests/setup.ts'],
    coverage: {
      provider:   'v8',
      reporter:   ['text', 'json', 'html'],
      include:    ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude:    ['lib/db/schema.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
});
