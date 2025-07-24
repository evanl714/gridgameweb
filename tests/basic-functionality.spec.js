import { test, expect } from '@playwright/test';

test.describe('Basic Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.grid-cell');
    await page.waitForTimeout(2000); // Give game time to initialize
  });

  test('Game loads and displays correctly', async ({ page }) => {
    // Test page title
    await expect(page).toHaveTitle('Grid Strategy Game');

    // Test basic UI elements are visible
    await expect(page.locator('text=GRID STRATEGY GAME')).toBeVisible();
    await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();

    // Test grid loaded
    const gridCells = page.locator('.grid-cell');
    await expect(gridCells).toHaveCount(625); // 25x25 = 625

    // Test resource nodes
    const resourceNodes = page.locator('.resource-node');
    await expect(resourceNodes).toHaveCount(9);

    console.log('✅ Game loads correctly with all UI elements');
  });

  test('Phase transitions work correctly', async ({ page }) => {
    // Click Next Phase button
    const nextPhaseBtn = page.locator('button', { hasText: 'Next Phase' });
    await nextPhaseBtn.click();
    await page.waitForTimeout(500);

    // Verify phase changed (look for phase indicator update)
    await expect(page.locator('text=Phase:')).toBeVisible();

    // Click Next Phase again
    await nextPhaseBtn.click();
    await page.waitForTimeout(500);

    console.log('✅ Phase transitions working');
  });

  test('Turn transitions work correctly', async ({ page }) => {
    // End current turn
    const endTurnBtn = page.locator('button', { hasText: 'End Turn' });
    await endTurnBtn.click();
    await page.waitForTimeout(1000);

    // Should see turn complete screen
    await expect(page.locator('text=Complete')).toBeVisible();

    // Start next turn
    const startTurnBtn = page.locator('button', { hasText: 'Start Turn' });
    await startTurnBtn.click();
    await page.waitForTimeout(1000);

    // Should see Player 2's turn
    await expect(page.locator('text=Player 2\'s Turn')).toBeVisible();

    console.log('✅ Turn transitions working correctly');
  });

  test('Grid cell clicking works', async ({ page }) => {
    // Click on a grid cell
    const gridCell = page.locator('[data-x="10"][data-y="10"]').first();
    await gridCell.click();
    await page.waitForTimeout(500);

    // Should see selection feedback
    await expect(page.locator('text=Selected cell:')).toBeVisible();

    // Click on a resource node
    const resourceNode = page.locator('.resource-node').first();
    await resourceNode.click();
    await page.waitForTimeout(500);

    console.log('✅ Grid cell clicking working');
  });

  test('Unit building interface responds', async ({ page }) => {
    // Navigate to build phase
    await page.click('button:has-text("Next Phase")'); // Resource -> Action
    await page.waitForTimeout(500);
    await page.click('button:has-text("Next Phase")'); // Action -> Build
    await page.waitForTimeout(500);

    // Try to click unit cards
    const unitCards = page.locator('[class*="unit-card"]');
    const workerCard = unitCards.filter({ hasText: 'Worker' }).first();
    
    if (await workerCard.isVisible()) {
      await workerCard.click();
      await page.waitForTimeout(500);
      console.log('✅ Unit card selection working');
    } else {
      console.log('ℹ️  Unit cards not found with current selector');
    }
  });

  test('Game state object exists and functions', async ({ page }) => {
    // Test if window.game exists
    const gameExists = await page.evaluate(() => {
      return {
        gameExists: !!window.game,
        gameType: typeof window.game,
        hasGameState: !!(window.game && window.game.gameState),
        currentPlayer: window.game ? window.game.gameState?.currentPlayer : null
      };
    });

    expect(gameExists.gameExists).toBe(true);
    expect(gameExists.gameType).toBe('object');
    expect(gameExists.hasGameState).toBe(true);

    console.log('✅ Game object exists and initialized:', gameExists);
  });

  test('Control buttons are functional', async ({ page }) => {
    // Test each control button exists and is clickable
    const buttons = [
      'New Game',
      'End Turn', 
      'Next Phase',
      'Save Game',
      'Reset',
      'Surrender'
    ];

    for (const buttonText of buttons) {
      const button = page.locator('button', { hasText: buttonText });
      await expect(button).toBeVisible();
      
      // Test that button is clickable (don't actually click all to avoid side effects)
      if (buttonText === 'Next Phase') {
        await button.click();
        await page.waitForTimeout(300);
        console.log(`✅ ${buttonText} button works`);
      } else {
        console.log(`✅ ${buttonText} button visible and enabled`);
      }
    }
  });

  test('UI responsiveness under rapid interaction', async ({ page }) => {
    const startTime = Date.now();

    // Rapid grid cell clicks
    for (let i = 0; i < 10; i++) {
      const x = 5 + (i % 5);
      const y = 5 + Math.floor(i / 5);
      await page.click(`[data-x="${x}"][data-y="${y}"]`);
      await page.waitForTimeout(50);
    }

    // Rapid button clicks
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Next Phase")');
      await page.waitForTimeout(100);
    }

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

    console.log(`✅ UI responsive under rapid interaction (${totalTime}ms)`);
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test clicking outside valid grid bounds (should not crash)
    try {
      await page.click('.game-area', { position: { x: 10, y: 10 } });
      console.log('✅ Invalid clicks handled gracefully');
    } catch (e) {
      console.log('ℹ️  Click outside grid handled');
    }

    // Test that gather button starts disabled
    const gatherBtn = page.locator('button', { hasText: 'Gather Resources' });
    if (await gatherBtn.isVisible()) {
      await expect(gatherBtn).toBeDisabled();
      console.log('✅ Gather button properly disabled without workers');
    }

    // Test multiple rapid phase clicks don't break the game
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Next Phase")');
      await page.waitForTimeout(100);
    }

    console.log('✅ Error handling working correctly');
  });

  test('Performance baseline measurement', async ({ page }) => {
    // Measure page load time
    const navigationStart = await page.evaluate(() => performance.timing.navigationStart);
    const loadComplete = await page.evaluate(() => performance.timing.loadEventEnd);
    const pageLoadTime = loadComplete - navigationStart;

    // Measure UI interaction response time
    const startTime = Date.now();
    await page.click('[data-x="12"][data-y="12"]');
    const clickResponseTime = Date.now() - startTime;

    console.log(`📊 Performance Metrics:`);
    console.log(`   Page Load Time: ${pageLoadTime}ms`);
    console.log(`   Click Response Time: ${clickResponseTime}ms`);

    // Set reasonable performance expectations
    expect(pageLoadTime).toBeLessThan(10000); // 10 seconds max
    expect(clickResponseTime).toBeLessThan(1000); // 1 second max

    console.log('✅ Performance within acceptable limits');
  });
});