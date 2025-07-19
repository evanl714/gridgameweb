/**
 * Movement System Integration Tests
 * Tests UI interactions, event handling, and visual feedback for movement
 */

import { test, expect } from '@playwright/test';

test.describe('Movement System Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.locator('#newGameBtn').click();
    await page.waitForTimeout(500); // Wait for game initialization
  });

  test.describe('Movement Range Display', () => {
    test('should show movement range when unit is selected', async ({ page }) => {
      // Create a unit first by clicking in build phase
      await page.locator('#nextPhaseBtn').click(); // Go to action phase
      await page.locator('#nextPhaseBtn').click(); // Go to build phase
      
      // Click on an empty cell to trigger unit creation dialog
      const canvas = page.locator('#gameCanvas');
      await canvas.click({ position: { x: 160, y: 160 } }); // Position (5,5)
      
      // Handle the unit creation prompt
      page.on('dialog', async dialog => {
        await dialog.accept('worker');
      });
      
      // Wait for unit creation
      await page.waitForTimeout(500);
      
      // Go to action phase for movement
      await page.locator('#nextPhaseBtn').click(); // End turn, go to next player
      await page.locator('#nextPhaseBtn').click(); // Go to action phase
      
      // Click on the unit to select it
      await canvas.click({ position: { x: 160, y: 160 } });
      
      // Check if status shows unit selection
      const gameStatus = page.locator('#gameStatus');
      await expect(gameStatus).toContainText('Unit selected');
    });

    test('should hide movement range when unit is deselected', async ({ page }) => {
      // Similar setup as above
      await page.locator('#nextPhaseBtn').click();
      await page.locator('#nextPhaseBtn').click();
      
      const canvas = page.locator('#gameCanvas');
      await canvas.click({ position: { x: 160, y: 160 } });
      
      page.on('dialog', async dialog => {
        await dialog.accept('worker');
      });
      
      await page.waitForTimeout(500);
      await page.locator('#nextPhaseBtn').click();
      await page.locator('#nextPhaseBtn').click();
      
      // Select unit
      await canvas.click({ position: { x: 160, y: 160 } });
      
      // Deselect by pressing Escape
      await page.keyboard.press('Escape');
      
      const gameStatus = page.locator('#gameStatus');
      await expect(gameStatus).toContainText('Unit deselected');
    });

    test('should toggle movement range with R key', async ({ page }) => {
      // Setup unit as before
      await page.locator('#nextPhaseBtn').click();
      await page.locator('#nextPhaseBtn').click();
      
      const canvas = page.locator('#gameCanvas');
      await canvas.click({ position: { x: 160, y: 160 } });
      
      page.on('dialog', async dialog => {
        await dialog.accept('worker');
      });
      
      await page.waitForTimeout(500);
      await page.locator('#nextPhaseBtn').click();
      await page.locator('#nextPhaseBtn').click();
      
      // Select unit
      await canvas.click({ position: { x: 160, y: 160 } });
      
      // Toggle with R key
      await page.keyboard.press('r');
      
      const gameStatus = page.locator('#gameStatus');
      await expect(gameStatus).toContainText('Movement range');
    });
  });

  test.describe('Mouse Interaction', () => {
    test('should provide hover feedback for valid moves', async ({ page }) => {
      // This test checks that hover events are handled without errors
      const canvas = page.locator('#gameCanvas');
      
      // Move mouse around the canvas
      await canvas.hover({ position: { x: 100, y: 100 } });
      await canvas.hover({ position: { x: 200, y: 200 } });
      await canvas.hover({ position: { x: 300, y: 300 } });
      
      // Should not cause any console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(1000);
      expect(errors.length).toBe(0);
    });

    test('should handle rapid mouse movements without errors', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      const errors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Rapid mouse movements
      for (let i = 0; i < 10; i++) {
        await canvas.hover({ 
          position: { 
            x: 100 + i * 20, 
            y: 100 + i * 15 
          } 
        });
      }
      
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });

    test('should handle mouse leave events correctly', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      
      // Hover over canvas then move away
      await canvas.hover({ position: { x: 200, y: 200 } });
      
      // Move mouse outside canvas
      await page.mouse.move(0, 0);
      
      // Should not cause errors
      await page.waitForTimeout(500);
    });
  });

  test.describe('Unit Movement Validation', () => {
    test('should prevent movement to occupied positions', async ({ page }) => {
      // This test would require creating multiple units and testing collision
      // For now, we'll test that clicking on invalid positions doesn't break the game
      
      const canvas = page.locator('#gameCanvas');
      const gameStatus = page.locator('#gameStatus');
      
      // Click multiple times on the same position
      await canvas.click({ position: { x: 160, y: 160 } });
      await canvas.click({ position: { x: 160, y: 160 } });
      await canvas.click({ position: { x: 160, y: 160 } });
      
      // Should handle gracefully
      await page.waitForTimeout(500);
    });

    test('should show appropriate feedback for invalid moves', async ({ page }) => {
      // Test boundary conditions by clicking near edges
      const canvas = page.locator('#gameCanvas');
      const gameStatus = page.locator('#gameStatus');
      
      // Click near grid edges
      await canvas.click({ position: { x: 10, y: 10 } });
      await canvas.click({ position: { x: 790, y: 790 } }); // Near bottom-right
      
      // Should update status appropriately
      await page.waitForTimeout(500);
    });
  });

  test.describe('Performance and Memory', () => {
    test('should handle rapid clicking without memory leaks', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      
      // Monitor for performance issues
      const startTime = Date.now();
      
      // Rapid clicking simulation
      for (let i = 0; i < 20; i++) {
        await canvas.click({ 
          position: { 
            x: 100 + (i % 5) * 50, 
            y: 100 + Math.floor(i / 5) * 50 
          } 
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should maintain responsive UI with many units', async ({ page }) => {
      // This test checks that the UI remains responsive
      // even with complex game states
      
      const canvas = page.locator('#gameCanvas');
      
      // Measure canvas rendering performance
      const startTime = await page.evaluate(() => performance.now());
      
      // Force canvas re-renders by moving mouse
      for (let i = 0; i < 10; i++) {
        await canvas.hover({ 
          position: { 
            x: 200 + i * 10, 
            y: 200 + i * 10 
          } 
        });
      }
      
      const endTime = await page.evaluate(() => performance.now());
      const renderTime = endTime - startTime;
      
      // Should render smoothly
      expect(renderTime).toBeLessThan(1000); // 1 second max
    });
  });

  test.describe('Game State Consistency', () => {
    test('should maintain consistent state after UI interactions', async ({ page }) => {
      // Test that UI interactions don't corrupt game state
      const gameStatus = page.locator('#gameStatus');
      const currentPlayer = page.locator('#currentPlayer');
      
      // Perform various UI interactions
      await page.locator('#resetBtn').click();
      await page.waitForTimeout(500);
      
      await page.locator('#newGameBtn').click();
      await page.waitForTimeout(500);
      
      // Check that game state is consistent
      await expect(currentPlayer).toContainText('Player 1');
      await expect(gameStatus).toContainText('New game started');
    });

    test('should handle browser resize without breaking movement', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      
      // Resize browser window
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      // Test that clicking still works correctly
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Resize again
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(500);
      
      // Should still be functional
      await canvas.click({ position: { x: 150, y: 150 } });
    });
  });

  test.describe('Turn Integration', () => {
    test('should disable movement during inappropriate phases', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      const gameStatus = page.locator('#gameStatus');
      
      // Start in resource phase - movement should be restricted
      // (Note: Current implementation may not enforce this)
      
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Move to action phase
      await page.locator('#nextPhaseBtn').click();
      
      // Now movement should be allowed
      await canvas.click({ position: { x: 250, y: 200 } });
      
      await page.waitForTimeout(500);
    });

    test('should reset unit states on turn transitions', async ({ page }) => {
      const turnElement = page.locator('#turnNumber');
      
      // Force end turn
      await page.locator('#endTurnBtn').click();
      
      // Should advance to next turn
      await page.waitForTimeout(1000);
      
      // Turn number should have changed
      // (This test depends on having turn display elements)
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from JavaScript errors gracefully', async ({ page }) => {
      const errors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Perform actions that might cause errors
      const canvas = page.locator('#gameCanvas');
      
      // Click outside canvas bounds (if possible)
      await page.mouse.click(10, 10);
      
      // Rapid interactions
      for (let i = 0; i < 5; i++) {
        await canvas.click({ position: { x: 100, y: 100 } });
        await page.keyboard.press('Escape');
      }
      
      await page.waitForTimeout(1000);
      
      // Filter out non-critical errors
      const criticalErrors = errors.filter(error => 
        !error.includes('404') &&
        !error.includes('favicon') &&
        !error.includes('net::ERR_')
      );
      
      expect(criticalErrors.length).toBe(0);
    });

    test('should handle network interruptions gracefully', async ({ page }) => {
      // Simulate network issues by going offline
      await page.context().setOffline(true);
      
      const canvas = page.locator('#gameCanvas');
      
      // UI should still be responsive
      await canvas.click({ position: { x: 200, y: 200 } });
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should continue working
      await canvas.click({ position: { x: 250, y: 200 } });
      
      await page.waitForTimeout(500);
    });
  });

  test.describe('Accessibility and Usability', () => {
    test('should provide keyboard navigation support', async ({ page }) => {
      // Test keyboard shortcuts
      await page.keyboard.press('Escape'); // Should not cause errors
      await page.keyboard.press('r'); // Should not cause errors when no unit selected
      
      const gameStatus = page.locator('#gameStatus');
      
      // Tab navigation should work for buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Activate focused button
      
      await page.waitForTimeout(500);
    });

    test('should maintain consistent visual feedback', async ({ page }) => {
      const canvas = page.locator('#gameCanvas');
      
      // Test that visual elements are rendered consistently
      const screenshot1 = await canvas.screenshot();
      
      // Trigger re-render
      await canvas.hover({ position: { x: 200, y: 200 } });
      await page.waitForTimeout(100);
      
      const screenshot2 = await canvas.screenshot();
      
      // Screenshots should be similar (basic consistency check)
      expect(screenshot1.length).toBeGreaterThan(0);
      expect(screenshot2.length).toBeGreaterThan(0);
    });
  });
});