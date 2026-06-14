import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // vitest 4's default threads pool crashes here when collecting multiple
    // files in parallel ("Cannot read properties of undefined (reading 'config')").
    // The forks pool is unaffected.
    pool: 'forks',
  },
});
