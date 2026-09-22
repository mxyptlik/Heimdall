import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['**/*.test.ts'],
    exclude: ['deepseek-harness/**', '.pnpm-store/**', '**/node_modules/**', '**/dist/**'],
  },
});
