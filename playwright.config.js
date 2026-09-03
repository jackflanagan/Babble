// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],
  use: {
    baseURL: 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'),
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      // iPhone in portrait — game shows rotation warning; tests must dismiss it first
      name: 'iphone-portrait',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'iphone-landscape',
      use: { browserName: 'chromium', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'android-portrait',
      use: { browserName: 'chromium', viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'android-landscape',
      use: { browserName: 'chromium', viewport: { width: 851, height: 393 }, isMobile: true, hasTouch: true },
    },
  ],
});
