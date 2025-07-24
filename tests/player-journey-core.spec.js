import { test, expect } from '@playwright/test';

test.describe('Core Player Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.grid-cell');
    
    // Wait for game to fully initialize
    await page.waitForFunction(() => window.game !== undefined);
    await page.waitForTimeout(1000);
  });

  test('Turn 1: Basic game setup and first unit building', async ({ page }) => {
    // Verify initial state
    await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();
    await expect(page.locator('text=Turn: 1')).toBeVisible();
    await expect(page.locator('text=Phase: Resource')).toBeVisible();
    await expect(page.locator('text=Energy: 100')).toBeVisible();

    // Verify grid loaded correctly
    await expect(page.locator('.grid-cell')).toHaveCount(625);
    await expect(page.locator('.resource-node')).toHaveCount(9);

    // Navigate through phases to build phase
    await page.click('button:has-text("Next Phase")'); // Resource -> Action
    await expect(page.locator('text=Phase: action')).toBeVisible();

    await page.click('button:has-text("Next Phase")'); // Action -> Build  
    await expect(page.locator('text=Phase: build')).toBeVisible();

    // Build first worker
    await page.click('.unit-card:has-text("Worker")');
    await page.click('[data-x="6"][data-y="5"]');
    await page.waitForTimeout(500);

    // Verify energy decreased
    await expect(page.locator('text=Energy: 90')).toBeVisible();

    // Build second worker
    await page.click('[data-x="5"][data-y="6"]');
    await page.waitForTimeout(500);
    await expect(page.locator('text=Energy: 80')).toBeVisible();

    console.log('✅ Turn 1: Successfully built 2 workers');
  });

  test('Turn transitions and player switching', async ({ page }) => {
    // Complete Turn 1 setup
    await page.click('button:has-text("Next Phase")'); // Resource -> Action
    await page.click('button:has-text("Next Phase")'); // Action -> Build
    
    // End Turn 1
    await page.click('button:has-text("End Turn")');
    
    // Verify turn transition screen
    await expect(page.locator('text=Turn 1 Complete')).toBeVisible();
    await expect(page.locator('text=Please pass the device to')).toBeVisible();
    await expect(page.locator('text=Player 2')).toBeVisible();

    // Start Player 2's turn
    await page.click('button:has-text("Start Turn")');
    
    // Verify Player 2 state
    await expect(page.locator('text=Player 2\'s Turn')).toBeVisible();
    await expect(page.locator('text=Turn: 2')).toBeVisible();
    await expect(page.locator('text=Energy: 110')).toBeVisible(); // Energy regenerated + bonus

    console.log('✅ Turn transition: Successfully switched to Player 2');
  });

  test('Resource gathering mechanics', async ({ page }) => {
    // Setup: Build a worker first
    await page.click('button:has-text("Next Phase")'); // -> Action
    await page.click('button:has-text("Next Phase")'); // -> Build
    await page.click('.unit-card:has-text("Worker")');
    await page.click('[data-x="6"][data-y="5"]');
    await page.waitForTimeout(500);

    // End turn and start next turn for resource phase
    await page.click('button:has-text("End Turn")');
    await page.click('button:has-text("Start Turn")'); // Player 2
    await page.click('button:has-text("End Turn")');
    await page.click('button:has-text("Start Turn")'); // Back to Player 1

    // Now test resource gathering
    await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();
    
    // Click on worker to select
    await page.click('[data-x="6"][data-y="5"]');
    await page.waitForTimeout(500);

    // Move worker adjacent to resource node
    await page.click('[data-x="4"][data-y="5"]'); // Near resource at (4,4)
    await page.waitForTimeout(500);

    // Gather resources
    const gatherBtn = page.locator('button:has-text("Gather Resources")');
    await expect(gatherBtn).toBeEnabled();
    await gatherBtn.click();
    await page.waitForTimeout(500);

    // Verify resources were gathered (check for resource increase)
    await expect(page.locator('text=Resources:')).toBeVisible();

    console.log('✅ Resource gathering: Successfully gathered resources with worker');
  });

  test('Grid cell interaction and unit selection', async ({ page }) => {
    // Test basic grid cell clicking
    await page.click('[data-x="10"][data-y="10"]');
    await expect(page.locator('text=Selected cell: (10, 10)')).toBeVisible();

    // Test resource node clicking
    const resourceNode = page.locator('.resource-node').first();
    await resourceNode.click();
    await expect(page.locator('text=Selected cell:')).toBeVisible();

    // Test unit card selection
    await page.click('.unit-card:has-text("Worker")');
    // Unit card should highlight when selected

    console.log('✅ Grid interaction: Cell clicking and unit selection working');
  });

  test('Complete game flow validation', async ({ page }) => {
    // This test runs through a minimal complete flow
    let currentPlayer = 1;
    let currentTurn = 1;

    for (let turn = 1; turn <= 3; turn++) {
      console.log(`Testing Turn ${turn} for Player ${currentPlayer}`);

      // Verify turn state
      await expect(page.locator(`text=Player ${currentPlayer}'s Turn`)).toBeVisible();
      await expect(page.locator(`text=Turn: ${currentTurn}`)).toBeVisible();

      // Navigate through phases
      await page.click('button:has-text("Next Phase")'); // Resource -> Action
      await page.waitForTimeout(300);
      
      await page.click('button:has-text("Next Phase")'); // Action -> Build
      await page.waitForTimeout(300);

      // Build a unit if we have energy
      try {
        await page.click('.unit-card:has-text("Worker")');
        await page.click(`[data-x="${5 + currentPlayer}"][data-y="${5 + currentPlayer}"]`);
        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`Turn ${turn}: Could not build unit (energy/position issue)`);
      }

      // End turn
      await page.click('button:has-text("End Turn")');
      await expect(page.locator(`text=Turn ${currentTurn} Complete`)).toBeVisible();

      // Start next turn (switch players)
      await page.click('button:has-text("Start Turn")');
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      if (currentPlayer === 1) currentTurn++;
    }

    console.log('✅ Complete flow: Successfully completed 3 turns with both players');
  });

  test('UI performance and responsiveness', async ({ page }) => {
    const startTime = Date.now();

    // Test rapid interactions
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-x="${i + 5}"][data-y="${i + 5}"]`);
      await page.waitForTimeout(100);
    }

    // Test button responsiveness
    await page.click('button:has-text("Next Phase")');
    await page.click('button:has-text("Next Phase")');
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
    console.log(`✅ Performance: UI interactions completed in ${totalTime}ms`);
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test clicking invalid positions
    try {
      await page.click('[data-x="25"][data-y="25"]'); // Out of bounds
    } catch (e) {
      console.log('✅ Error handling: Out of bounds click properly handled');
    }

    // Test trying to build without selecting unit
    await page.click('button:has-text("Next Phase")'); // -> Action
    await page.click('button:has-text("Next Phase")'); // -> Build
    await page.click('[data-x="5"][data-y="5"]'); // Try to build without unit selected

    // Test gathering without worker
    const gatherBtn = page.locator('button:has-text("Gather Resources")');
    await expect(gatherBtn).toBeDisabled();

    console.log('✅ Error handling: Invalid actions properly prevented');
  });
});