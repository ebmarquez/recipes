import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4322/recipes/',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node tests/serve-pilot.ts',
    url: 'http://127.0.0.1:4322/recipes/',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
  globalTeardown: './tests/restore-build.ts',
});
