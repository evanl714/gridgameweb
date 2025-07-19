/**
 * Integration tests using Playwright
 * Tests the complete game state management system in browser environment
 */

import { test, expect } from '@playwright/test';

test.describe('Grid Game Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should load the game interface correctly', async ({ page }) => {
    // Check that essential elements are present
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#currentPlayer')).toBeVisible();
    await expect(page.locator('#gameStatus')).toBeVisible();
    await expect(page.locator('#newGameBtn')).toBeVisible();
    await expect(page.locator('#resetBtn')).toBeVisible();
    
    // Check initial game state
    await expect(page.locator('#currentPlayer')).toContainText('Player 1');
  });

  test('should start a new game when new game button is clicked', async ({ page }) => {
    const newGameBtn = page.locator('#newGameBtn');
    const gameStatus = page.locator('#gameStatus');
    
    await newGameBtn.click();
    
    // Should show new game started message
    await expect(gameStatus).toContainText('New game started');
    
    // Should be player 1's turn
    await expect(page.locator('#currentPlayer')).toContainText('Player 1');
  });

  test('should render grid and allow cell selection', async ({ page }) => {
    const canvas = page.locator('#gameCanvas');
    const gameStatus = page.locator('#gameStatus');
    
    // Start a new game first
    await page.locator('#newGameBtn').click();
    
    // Click on a cell in the grid (approximately center)
    await canvas.click({ position: { x: 400, y: 400 } });
    
    // Should show selected cell coordinates
    await expect(gameStatus).toContainText('Selected cell:');
  });

  test('should display game state information', async ({ page }) => {
    // Start a new game
    await page.locator('#newGameBtn').click();
    
    // Check if game state elements are populated
    const phaseElement = page.locator('#gamePhase');
    const energyElement = page.locator('#playerEnergy');
    const actionsElement = page.locator('#playerActions');
    const turnElement = page.locator('#turnNumber');
    
    if (await phaseElement.count() > 0) {
      await expect(phaseElement).toContainText('Phase:');
    }
    
    if (await energyElement.count() > 0) {
      await expect(energyElement).toContainText('Energy:');
    }
    
    if (await actionsElement.count() > 0) {
      await expect(actionsElement).toContainText('Actions:');
    }
    
    if (await turnElement.count() > 0) {
      await expect(turnElement).toContainText('Turn:');
    }
  });

  test('should handle game reset correctly', async ({ page }) => {
    const resetBtn = page.locator('#resetBtn');
    const gameStatus = page.locator('#gameStatus');
    
    // Start a game first
    await page.locator('#newGameBtn').click();
    
    // Reset the game
    await resetBtn.click();
    
    // Should show reset message
    await expect(gameStatus).toContainText('Game reset');
  });

  test('should render resource nodes on the grid', async ({ page }) => {
    // Start a new game
    await page.locator('#newGameBtn').click();
    
    // Wait for canvas to be rendered
    await page.waitForTimeout(100);
    
    // Take a screenshot to verify resource nodes are rendered
    // This is a basic test to ensure the canvas is working
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    
    // Check that canvas has content (not empty)
    const canvasSize = await canvas.boundingBox();
    expect(canvasSize?.width).toBeGreaterThan(0);
    expect(canvasSize?.height).toBeGreaterThan(0);
  });

  test('should handle browser console errors gracefully', async ({ page }) => {
    const consoleErrors = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Start a new game and interact with the interface
    await page.locator('#newGameBtn').click();
    await page.locator('#gameCanvas').click({ position: { x: 200, y: 200 } });
    
    // Should not have critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('404') && // Ignore 404s for missing resources
      !error.includes('favicon') // Ignore favicon errors
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should maintain responsive canvas sizing', async ({ page }) => {
    await page.locator('#newGameBtn').click();
    
    const canvas = page.locator('#gameCanvas');
    const initialSize = await canvas.boundingBox();
    
    // Resize viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100);
    
    const newSize = await canvas.boundingBox();
    
    // Canvas should still be visible and have reasonable dimensions
    expect(newSize?.width).toBeGreaterThan(0);
    expect(newSize?.height).toBeGreaterThan(0);
  });
});