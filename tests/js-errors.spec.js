import { test, expect } from '@playwright/test';

test.describe('JavaScript Error Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console logs and errors
    page.on('console', (msg) => {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('check for JavaScript errors and function calls', async ({ page }) => {
    // Check if game object exists
    const gameExists = await page.evaluate(() => {
      return typeof window.game !== 'undefined';
    });
    console.log('window.game exists:', gameExists);

    // Check if the newGame method exists
    const newGameMethodExists = await page.evaluate(() => {
      return window.game && typeof window.game.newGame === 'function';
    });
    console.log('window.game.newGame method exists:', newGameMethodExists);

    // Override the newGame method to log when it's called
    await page.evaluate(() => {
      if (window.game && window.game.newGame) {
        const originalNewGame = window.game.newGame.bind(window.game);
        window.game.newGame = function () {
          console.log('newGame() method called!');
          return originalNewGame();
        };
      }
    });

    // Override updateStatus to see if it's called
    await page.evaluate(() => {
      if (window.game && window.game.updateStatus) {
        const originalUpdateStatus = window.game.updateStatus.bind(window.game);
        window.game.updateStatus = function (message) {
          console.log('updateStatus() called with:', message);
          return originalUpdateStatus(message);
        };
      }
    });

    // Now click the button and see what happens
    console.log('\n=== CLICKING NEW GAME BUTTON ===');
    const newGameBtn = page.locator('#newGameBtn');
    await newGameBtn.click();

    await page.waitForTimeout(2000);

    // Check game state
    const gameState = await page.evaluate(() => {
      if (window.game && window.game.gameState) {
        return {
          currentPlayer: window.game.gameState.currentPlayer,
          currentPhase: window.game.gameState.currentPhase,
          gameStarted: window.game.gameState.gameStarted,
        };
      }
      return null;
    });
    console.log('Game state after click:', gameState);

    // Check if UI system is initialized
    const uiManagerExists = await page.evaluate(() => {
      return (
        window.game &&
        window.game.uiManager &&
        typeof window.game.uiManager === 'object'
      );
    });
    console.log('UI Manager exists:', uiManagerExists);

    if (uiManagerExists) {
      const uiManagerInitialized = await page.evaluate(() => {
        return window.game.uiManager.initialized;
      });
      console.log('UI Manager initialized:', uiManagerInitialized);
    }
  });
});
