import { chromium } from 'playwright';

async function testGridConsole() {
  console.log('Starting browser test...');

  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down operations
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });

  // Collect any errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for DOM to be ready
    await page.waitForLoadState('domcontentloaded');

    // Wait a bit for JavaScript to initialize
    await page.waitForTimeout(5000);

    // Check grid state
    const gridState = await page.evaluate(() => {
      const gameBoard = document.getElementById('gameBoard');
      const gameCanvas = document.getElementById('gameCanvas');
      const gridCells = document.querySelectorAll('.grid-cell');
      const resourceNodes = document.querySelectorAll('.resource-node');

      return {
        hasGameBoard: !!gameBoard,
        gameBoardChildren: gameBoard ? gameBoard.children.length : 0,
        hasGameCanvas: !!gameCanvas,
        canvasDisplay: gameCanvas ? getComputedStyle(gameCanvas).display : 'not found',
        canvasSize: gameCanvas ? `${gameCanvas.width}x${gameCanvas.height}` : 'not found',
        gridCellCount: gridCells.length,
        resourceNodeCount: resourceNodes.length,
        hasGameObject: typeof window.game !== 'undefined',
        gameState: window.game ? {
          hasGameState: !!window.game.gameState,
          hasUIManager: !!window.game.uiManager,
          hasRenderMethod: typeof window.game.render === 'function',
          gridAdapterInitialized: !!window.game.gridAdapterInitialized
        } : null
      };
    });

    console.log('\n=== BROWSER GRID STATE ===');
    console.log(JSON.stringify(gridState, null, 2));

    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(error => console.log(error));
    }

    // Take a screenshot for visual debugging
    await page.screenshot({ path: '/Users/evanluchs/gridgameweb/debug-grid-screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to debug-grid-screenshot.png');

    // Keep browser open for a moment to inspect
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testGridConsole().catch(console.error);
