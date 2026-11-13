import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://localhost:4173/puzzle-games/', channel: process.platform === 'win32' ? 'chrome' : undefined, headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173/puzzle-games/', reuseExistingServer: false, timeout: 30000 }
});
