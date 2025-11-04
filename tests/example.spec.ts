import { test, expect } from '@playwright/test';

test.describe('Video Recording Demo Tests', () => {
  test('homepage navigation with video', async ({ page }) => {
    // This will be recorded as a video
    await page.goto('https://playwright.dev');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveTitle(/Playwright/);
    await page.waitForTimeout(500);
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);
    
    // Click on Get Started
    await page.click('text=Get started');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveURL(/.*docs.*/);
  });

  test('search functionality with video', async ({ page }) => {
    await page.goto('https://playwright.dev');
    await page.waitForTimeout(500);
    
    // Try to find and click search
    const searchButton = page.locator('button:has-text("Search")').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await page.waitForTimeout(500);
      
      // Type in search
      await page.keyboard.type('selectors');
      await page.waitForTimeout(1500);
    }
  });

  test('documentation browsing with video', async ({ page }) => {
    await page.goto('https://playwright.dev/docs/intro');
    await page.waitForTimeout(1000);
    
    // Scroll through the page
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(800);
    }
    
    // Click on a link
    await page.click('text=Installation').catch(() => {});
    await page.waitForTimeout(2000);
  });
});