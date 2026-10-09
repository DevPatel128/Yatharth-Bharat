import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the real production artefact: the static export served by the Worker
// (wrangler dev), the same code path as Cloudflare. Build first: npm run build.
export default defineConfig({
  testDir: 'test/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:8787' },
  webServer: { command: 'npx wrangler dev --port 8787', url: 'http://localhost:8787/api/health', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
