import { test, expect } from '@playwright/test';

test.describe('UI Structure Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('analyze UI structure before and after new game click', async ({
    page,
  }) => {
    console.log('\n=== BEFORE NEW GAME CLICK ===');

    // Check if original elements exist
    const originalStatus = await page.locator('#gameStatus').count();
    const originalPlayer = await page.locator('#currentPlayer').count();

    console.log('Original #gameStatus elements:', originalStatus);
    console.log('Original #currentPlayer elements:', originalPlayer);

    if (originalStatus > 0) {
      console.log(
        'Original gameStatus text:',
        await page.locator('#gameStatus').textContent(),
      );
    }
    if (originalPlayer > 0) {
      console.log(
        'Original currentPlayer text:',
        await page.locator('#currentPlayer').textContent(),
      );
    }

    // Get all elements that might contain status info
    const allStatusElements = await page
      .locator(
        '[id*="status"], [class*="status"], [id*="game"], [class*="game"]',
      )
      .count();
    console.log(
      'Total elements with status/game in id/class:',
      allStatusElements,
    );

    // Click new game button
    await page.locator('#newGameBtn').click();
    await page.waitForTimeout(1000);

    console.log('\n=== AFTER NEW GAME CLICK ===');

    // Check elements again
    const newStatus = await page.locator('#gameStatus').count();
    const newPlayer = await page.locator('#currentPlayer').count();

    console.log('After #gameStatus elements:', newStatus);
    console.log('After #currentPlayer elements:', newPlayer);

    if (newStatus > 0) {
      console.log(
        'After gameStatus text:',
        await page.locator('#gameStatus').textContent(),
      );
    }
    if (newPlayer > 0) {
      console.log(
        'After currentPlayer text:',
        await page.locator('#currentPlayer').textContent(),
      );
    }

    // Check for new UI elements
    const uiContainers = await page.locator('.ui-container').count();
    const gameStatusContainers = await page
      .locator('#gameStatusContainer')
      .count();
    const resourceContainers = await page
      .locator('#resourceDisplayContainer')
      .count();

    console.log('UI containers:', uiContainers);
    console.log('Game status containers:', gameStatusContainers);
    console.log('Resource containers:', resourceContainers);

    // Check for any status-related text on the page
    const pageText = await page.textContent('body');
    const hasNewGameStarted = pageText.includes('New game started');
    const hasGameReset = pageText.includes('Game reset');
    const hasReady = pageText.includes('Ready');

    console.log('Page contains "New game started":', hasNewGameStarted);
    console.log('Page contains "Game reset":', hasGameReset);
    console.log('Page contains "Ready":', hasReady);

    // List all elements with IDs that contain 'status' or 'game'
    const statusGameElements = await page.evaluate(() => {
      const elements = document.querySelectorAll(
        '[id*="status"], [id*="game"], [id*="Game"]',
      );
      return Array.from(elements).map((el) => ({
        id: el.id,
        tagName: el.tagName,
        textContent: el.textContent?.trim(),
        className: el.className,
      }));
    });

    console.log('\nElements with status/game in ID:');
    statusGameElements.forEach((el) => {
      console.log(
        `- ${el.tagName}#${el.id}.${el.className}: "${el.textContent}"`,
      );
    });
  });
});
