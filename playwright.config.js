import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:4319' },
  webServer: {
    command: 'npx vite preview --port 4319 --strictPort',
    port: 4319,
    reuseExistingServer: true,
  },
})
