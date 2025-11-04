import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  // Configure reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://playwright.dev',
    
    // IMPORTANT: Always record videos
    video: {
      mode: 'on',  // Record video for ALL tests
      size: { width: 1280, height: 720 }  // HD quality
    },
    
    // Always capture traces
    trace: 'on',
    
    // Always take screenshots
    screenshot: 'on',
    
    // Set viewport
    viewport: { width: 1280, height: 720 },
    
    // Set timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],  // For better video capture
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Output directory for test results
  outputDir: 'test-results/',
});