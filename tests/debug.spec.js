import { test, expect } from '@playwright/test';

test.describe('Debug UI Interface Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('debug new game button interaction', async ({ page }) => {
    // Check initial state
    const gameStatus = page.locator('#gameStatus');
    console.log('Initial status:', await gameStatus.textContent());

    // Listen for console logs
    page.on('console', (msg) => {
      console.log('Browser console:', msg.text());
    });

    // Take a screenshot before clicking
    await page.screenshot({ path: 'debug-before-click.png' });

    // Click the new game button
    const newGameBtn = page.locator('#newGameBtn');
    await newGameBtn.click();

    // Wait a bit for any updates
    await page.waitForTimeout(1000);

    // Check status after clicking
    console.log('Status after clicking:', await gameStatus.textContent());

    // Take a screenshot after clicking
    await page.screenshot({ path: 'debug-after-click.png' });

    // Check if there are any error messages
    const allText = await page.textContent('body');
    console.log(
      'Page contains "error":',
      allText.toLowerCase().includes('error'),
    );

    // Check if gameStatus element is still there
    console.log(
      'gameStatus element count:',
      await page.locator('#gameStatus').count(),
    );
  });
});
