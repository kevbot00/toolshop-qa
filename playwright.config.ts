import { defineConfig, devices } from '@playwright/test';
import { API_URL, BASE_URL } from './src/config';

const isCI = !!process.env.CI;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry in CI so a single infrastructure hiccup doesn't fail the build. Retried tests are
  // still reported as "flaky" in the HTML report, so they get looked at rather than hidden.
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  // In CI each project runs in its own job and writes a blob report; the report job merges them
  // into one HTML report. Locally, an HTML report plus a line per test.
  reporter: isCI ? [['blob'], ['github']] : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    // The app ships data-test attributes, so getByTestId() targets them instead of CSS or copy text.
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: API_URL, extraHTTPHeaders: { accept: 'application/json' } },
    },
    { name: 'chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testDir: './tests/ui', use: { ...devices['Desktop Firefox'] } },
  ],
});
