import { defineConfig, devices } from '@playwright/test'

const PORT = 5180

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: `npx vite demo --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
