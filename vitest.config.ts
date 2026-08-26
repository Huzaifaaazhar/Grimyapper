import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      /*
       * `lib/judge.ts` and `lib/appeal.ts` are marked `server-only`, and the
       * tests exercise them directly. Next resolves that package to an empty
       * module under React's server condition; point the runner at the same
       * empty module so it resolves the way the server does. No test renders a
       * component, so nothing else is affected by this.
       */
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
