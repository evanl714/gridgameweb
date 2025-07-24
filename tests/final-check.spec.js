import { test, expect } from '@playwright/test';

test.describe('Final UI System Check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('comprehensive UI system verification', async ({ page }) => {
    // Track all network requests to identify 404 errors
    const failedRequests = [];
    page.on('response', (response) => {
      if (response.status() === 404) {
        failedRequests.push(response.url());
      }
    });

    // Track console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Check if game is properly initialized
    const gameExists = await page.evaluate(
      () => typeof window.game !== 'undefined',
    );
    console.log('✅ Game object exists:', gameExists);

    // Check if UI Manager is working
    const uiManagerWorking = await page.evaluate(() => {
      return (
        window.game &&
        window.game.uiManager &&
        window.game.uiManager.initialized
      );
    });
    console.log('✅ UI Manager initialized:', uiManagerWorking);

    // Check if new UI components are rendered
    const uiContainers = await page.locator('.ui-container').count();
    const resourceContainer = await page
      .locator('#resourceDisplayContainer')
      .count();
    const turnContainer = await page.locator('#turnInterfaceContainer').count();
    const gameStatusContainer = await page
      .locator('#gameStatusContainer')
      .count();
    const unitContainer = await page.locator('#unitDisplayContainer').count();

    console.log('✅ UI containers rendered:', {
      main: uiContainers,
      resource: resourceContainer,
      turn: turnContainer,
      gameStatus: gameStatusContainer,
      unit: unitContainer,
    });

    // Test button functionality
    console.log('\n=== Testing Button Functionality ===');
    await page.locator('#newGameBtn').click();
    await page.waitForTimeout(500);

    const statusAfterNewGame = await page.locator('#gameStatus').textContent();
    console.log('✅ Status after new game:', statusAfterNewGame);

    await page.locator('#resetBtn').click();
    await page.waitForTimeout(500);

    const statusAfterReset = await page.locator('#gameStatus').textContent();
    console.log('✅ Status after reset:', statusAfterReset);

    // Test canvas interaction
    const canvas = page.locator('#gameCanvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(500);

    const statusAfterClick = await page.locator('#gameStatus').textContent();
    console.log('✅ Status after canvas click:', statusAfterClick);

    // Wait for any final network requests
    await page.waitForTimeout(2000);

    // Report any issues
    console.log('\n=== Final Report ===');
    console.log('❌ 404 Errors:', failedRequests);
    console.log(
      '❌ Console Errors:',
      consoleErrors.filter(
        (err) => !err.includes('404') && !err.includes('favicon'),
      ),
    );

    // Take final screenshot for visual verification
    await page.screenshot({ path: 'final-ui-state.png', fullPage: true });
    console.log('📸 Final screenshot saved as final-ui-state.png');
  });
});
