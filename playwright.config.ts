import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:5173",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ["--enable-webgl", "--ignore-gpu-blocklist"] },
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
