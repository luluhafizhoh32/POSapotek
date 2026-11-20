import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/modul/**/layanan.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
