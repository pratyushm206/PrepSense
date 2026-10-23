const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'verify.spec.cjs',
  timeout: 60000,
  workers: 1,
  reporter: [['json', { outputFile: 'artifacts/report.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5055',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 900 }
  },
  outputDir: 'test-results'
});
