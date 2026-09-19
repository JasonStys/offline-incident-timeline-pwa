/**
 * @file Configures cross-browser, offline, accessibility, and worker end-to-end tests.
 * Functions: none; this module exports Playwright configuration.
 * Variables: externalServer, baseURL, webServer, reporters, and browser projects.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { defineConfig, devices } from "@playwright/test";

const externalServer = Boolean(process.env.PLAYWRIGHT_EXTERNAL_SERVER);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  ...(process.env.CI ? {} : { workers: 1 }),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4391",
    trace: "retain-on-failure",
    serviceWorkers: "allow",
  },
  ...(externalServer
    ? {}
    : {
        webServer: {
          command:
            "node node_modules/vite/bin/vite.js build && node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4391",
          port: 4391,
          reuseExistingServer: false,
          timeout: 120000,
        },
      }),
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
