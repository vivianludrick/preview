import { defineConfig } from '@playwright/test';

/**
 * UI tests run against the production build (`npm run build` first — the
 * `test:e2e` script does both). Uses the locally installed Chrome via the
 * "chrome" channel so no browser download is needed.
 */
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: 'http://localhost:4573',
		channel: 'chrome',
		headless: true
	},
	webServer: {
		command: 'npx serve build -l 4573',
		url: 'http://localhost:4573',
		reuseExistingServer: !process.env.CI,
		timeout: 30_000
	}
});
