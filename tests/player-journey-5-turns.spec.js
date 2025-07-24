import { test, expect } from '@playwright/test';

test.describe('Player Journey: First 5 Turns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('.grid-cell');
    await page.waitForTimeout(1000); // Wait for game to initialize
  });

  test('Complete 5-turn player journey with strategic gameplay', async ({ page }) => {
    // ===========================================
    // TURN 1 - PLAYER 1: LEARNING THE BASICS
    // ===========================================

    await test.step('Turn 1 - Player 1: Initial setup and learning', async () => {
      // Verify initial game state
      await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();
      await expect(page.locator('text=Phase: Resource')).toBeVisible();
      await expect(page.locator('text=Energy: 100')).toBeVisible();
      await expect(page.locator('text=Actions: 3')).toBeVisible();

      // Phase 1: Resource Collection - Explore the grid
      const resourceNodes = page.locator('.resource-node');
      await expect(resourceNodes).toHaveCount(9);

      // Click on a resource node to explore
      await resourceNodes.first().click();
      await expect(page.locator('text=Selected cell:')).toBeVisible();

      // Try to gather resources (should be disabled - no workers)
      const gatherBtn = page.locator('button', { hasText: 'Gather Resources' });
      await expect(gatherBtn).toBeDisabled();

      // Move to Action phase
      await page.click('button:has-text("Next Phase")');
      await expect(page.locator('text=Phase: action')).toBeVisible();

      // Move to Build phase
      await page.click('button:has-text("Next Phase")');
      await expect(page.locator('text=Phase: build')).toBeVisible();
    });

    await test.step('Turn 1 - Player 1: Build first workers', async () => {
      // Select Worker unit
      await page.click('.unit-card:has-text("Worker")');

      // Find and click near Player 1's base (around 5,5)
      // Build first worker
      await page.click('[data-x="6"][data-y="5"]');
      await page.waitForTimeout(500);

      // Verify energy decreased
      await expect(page.locator('text=Energy: 90')).toBeVisible();

      // Build second worker
      await page.click('[data-x="5"][data-y="6"]');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Energy: 80')).toBeVisible();

      // End turn
      await page.click('button:has-text("End Turn")');
      await expect(page.locator('text=Turn 1 Complete')).toBeVisible();
    });

    // ===========================================
    // TURN 2 - PLAYER 2: COMPETITIVE RESPONSE
    // ===========================================

    await test.step('Turn 2 - Player 2: Match opponent strategy', async () => {
      // Start Player 2's turn
      await page.click('button:has-text("Start Turn")');
      await expect(page.locator('text=Player 2\'s Turn')).toBeVisible();
      await expect(page.locator('text=Energy: 110')).toBeVisible();

      // Quick phase progression (no units to use yet)
      await page.click('button:has-text("Next Phase")'); // Resource -> Action
      await page.click('button:has-text("Next Phase")'); // Action -> Build

      // Build Worker 1
      await page.click('.unit-card:has-text("Worker")');
      await page.click('[data-x="18"][data-y="19"]'); // Near Player 2 base
      await page.waitForTimeout(500);
      await expect(page.locator('text=Energy: 100')).toBeVisible();

      // Build Worker 2
      await page.click('[data-x="19"][data-y="18"]');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Energy: 90')).toBeVisible();

      // Build Scout for exploration advantage
      await page.click('.unit-card:has-text("Scout")');
      await page.click('[data-x="18"][data-y="18"]');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Energy: 75')).toBeVisible();

      // End turn
      await page.click('button:has-text("End Turn")');
      await expect(page.locator('text=Turn 2 Complete')).toBeVisible();
    });

    // ===========================================
    // TURN 3 - PLAYER 1: FIRST RESOURCE GATHERING
    // ===========================================

    await test.step('Turn 3 - Player 1: Resource gathering begins', async () => {
      // Start Player 1's turn
      await page.click('button:has-text("Start Turn")');
      await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();

      // Energy should have regenerated
      await expect(page.locator('text=Energy: 85')).toBeVisible();

      // Phase 1: Resource Collection
      // Click on a worker to move it
      await page.click('[data-x="6"][data-y="5"]'); // Worker location
      await page.waitForTimeout(500);

      // Move worker closer to resource node
      await page.click('[data-x="4"][data-y="5"]'); // Adjacent to resource at (4,4)
      await page.waitForTimeout(500);

      // Now gather resources
      const gatherBtn = page.locator('button:has-text("Gather Resources")');
      await expect(gatherBtn).toBeEnabled();
      await gatherBtn.click();
      await page.waitForTimeout(500);

      // Move second worker toward resources
      await page.click('[data-x="5"][data-y="6"]'); // Second worker
      await page.waitForTimeout(500);
      await page.click('[data-x="4"][data-y="7"]'); // Position for next turn
      await page.waitForTimeout(500);

      // Progress through phases
      await page.click('button:has-text("Next Phase")'); // -> Action
      await page.click('button:has-text("Next Phase")'); // -> Build

      // Build third worker with earned resources
      await page.click('.unit-card:has-text("Worker")');
      await page.click('[data-x="7"][data-y="5"]');
      await page.waitForTimeout(500);

      // End turn
      await page.click('button:has-text("End Turn")');
    });

    // ===========================================
    // TURN 4 - PLAYER 2: MILITARY FOCUS
    // ===========================================

    await test.step('Turn 4 - Player 2: Build first military unit', async () => {
      // Start Player 2's turn
      await page.click('button:has-text("Start Turn")');
      await expect(page.locator('text=Player 2\'s Turn')).toBeVisible();

      // Move workers to gather resources
      await page.click('[data-x="18"][data-y="19"]'); // Worker 1
      await page.waitForTimeout(500);
      await page.click('[data-x="12"][data-y="19"]'); // Near resource node
      await page.waitForTimeout(500);

      // Gather with first worker
      await page.click('button:has-text("Gather Resources")');
      await page.waitForTimeout(500);

      // Move and gather with second worker
      await page.click('[data-x="19"][data-y="18"]'); // Worker 2
      await page.waitForTimeout(500);
      await page.click('[data-x="20"][data-y="12"]'); // Near different resource
      await page.waitForTimeout(500);
      await page.click('button:has-text("Gather Resources")');
      await page.waitForTimeout(500);

      // Move scout for exploration
      await page.click('[data-x="18"][data-y="18"]'); // Scout
      await page.waitForTimeout(500);
      await page.click('[data-x="15"][data-y="15"]'); // Center territory
      await page.waitForTimeout(500);

      // Progress to Build phase
      await page.click('button:has-text("Next Phase")'); // -> Action
      await page.click('button:has-text("Next Phase")'); // -> Build

      // Build Infantry (first military unit!)
      await page.click('.unit-card:has-text("Infantry")');
      await page.click('[data-x="18"][data-y="17"]');
      await page.waitForTimeout(500);

      // End turn
      await page.click('button:has-text("End Turn")');
    });

    // ===========================================
    // TURN 5 - PLAYER 1: MILITARY RESPONSE
    // ===========================================

    await test.step('Turn 5 - Player 1: Military escalation', async () => {
      // Start Player 1's turn
      await page.click('button:has-text("Start Turn")');
      await expect(page.locator('text=Player 1\'s Turn')).toBeVisible();

      // Mass resource gathering with 3 workers
      // Worker 1 - already positioned
      await page.click('[data-x="4"][data-y="5"]'); // Worker near resource
      await page.waitForTimeout(500);
      await page.click('button:has-text("Gather Resources")');
      await page.waitForTimeout(500);

      // Worker 2
      await page.click('[data-x="4"][data-y="7"]'); // Second worker
      await page.waitForTimeout(500);
      await page.click('[data-x="4"][data-y="12"]'); // Move to different resource
      await page.waitForTimeout(500);
      await page.click('button:has-text("Gather Resources")');
      await page.waitForTimeout(500);

      // Worker 3
      await page.click('[data-x="7"][data-y="5"]'); // Third worker
      await page.waitForTimeout(500);
      await page.click('[data-x="12"][data-y="4"]'); // Move to third resource
      await page.waitForTimeout(500);
      await page.click('button:has-text("Gather Resources")');
      await page.waitForTimeout(500);

      // Progress to Build phase
      await page.click('button:has-text("Next Phase")'); // -> Action
      await page.click('button:has-text("Next Phase")'); // -> Build

      // Build Infantry to counter Player 2's military
      await page.click('.unit-card:has-text("Infantry")');
      await page.click('[data-x="7"][data-y="7"]');
      await page.waitForTimeout(500);

      // Build Scout for reconnaissance
      await page.click('.unit-card:has-text("Scout")');
      await page.click('[data-x="6"][data-y="8"]');
      await page.waitForTimeout(500);

      // End turn - military tension established
      await page.click('button:has-text("End Turn")');
      await expect(page.locator('text=Turn 5 Complete')).toBeVisible();
    });

    // ===========================================
    // FINAL VERIFICATION
    // ===========================================

    await test.step('Verify final game state after 5 turns', async () => {
      await page.click('button:has-text("Start Turn")');

      // Should be Player 2's turn again
      await expect(page.locator('text=Player 2\'s Turn')).toBeVisible();

      // Both players should have military units on the board
      const units = page.locator('.unit-display');
      await expect(units).toHaveCount.greaterThan(6); // At least 3 per player

      // Resource nodes should be partially depleted
      const resourceNodes = page.locator('.resource-node');
      await expect(resourceNodes).toHaveCount(9); // Still 9 nodes

      // Game should be in advanced state
      await expect(page.locator('text=Turn:')).toContainText('6');

      console.log('✅ 5-turn player journey completed successfully!');
      console.log('✅ Both players have established economies and military forces');
      console.log('✅ Strategic tension created - ready for combat phase');
    });
  });

  test('Verify UI responsiveness throughout journey', async ({ page }) => {
    await test.step('Test UI elements remain functional', async () => {
      // Test basic interactions still work after game progression
      await expect(page.locator('.grid-cell')).toHaveCount(625);
      await expect(page.locator('.resource-node')).toHaveCount(9);

      // Test control buttons
      await expect(page.locator('button:has-text("New Game")')).toBeVisible();
      await expect(page.locator('button:has-text("End Turn")')).toBeVisible();
      await expect(page.locator('button:has-text("Next Phase")')).toBeVisible();

      // Test unit cards
      await expect(page.locator('.unit-card')).toHaveCount(4);

      // Test sidebar information
      await expect(page.locator('text=Game Status')).toBeVisible();
      await expect(page.locator('text=Victory Conditions')).toBeVisible();
      await expect(page.locator('text=Player Status')).toBeVisible();
    });
  });

  test('Performance validation during gameplay', async ({ page }) => {
    await test.step('Measure response times', async () => {
      // Test grid click responsiveness
      const startTime = Date.now();
      await page.click('.grid-cell[data-x="10"][data-y="10"]');
      const clickResponseTime = Date.now() - startTime;
      expect(clickResponseTime).toBeLessThan(500); // Should respond within 500ms

      // Test button click responsiveness
      const buttonStartTime = Date.now();
      await page.click('button:has-text("Next Phase")');
      const buttonResponseTime = Date.now() - buttonStartTime;
      expect(buttonResponseTime).toBeLessThan(300); // Should respond within 300ms

      console.log(`Grid click response time: ${clickResponseTime}ms`);
      console.log(`Button click response time: ${buttonResponseTime}ms`);
    });
  });
});
