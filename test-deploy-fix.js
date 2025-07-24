import { chromium } from 'playwright';

async function testDeploymentFix() {
  console.log('Testing ES6 module loading fix...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`CONSOLE ${msg.type()}: ${msg.text()}`);
  });
  
  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('Navigating to deployed game...');
    await page.goto('https://gridgameweb-production.up.railway.app/', { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for initialization
    await page.waitForTimeout(8000);
    
    // Check if game initialized properly
    const gameState = await page.evaluate(() => {
      return {
        hasGameObject: typeof window.game !== 'undefined',
        gameInitialized: window.game ? (
          !!window.game.commandManager && 
          !!window.game.inputController &&
          !!window.game.gameState
        ) : false,
        commandManagerExists: window.game ? !!window.game.commandManager : false,
        actionHandlersExists: window.game ? !!window.game.actionHandlers : false,
        errorInConsole: window.console ? window.console.error : null
      };
    });
    
    console.log('\n=== GAME STATE AFTER FIX ===');
    console.log(JSON.stringify(gameState, null, 2));
    
    if (gameState.gameInitialized) {
      console.log('\n✅ SUCCESS: Game initialized properly!');
      
      // Test New Game button
      console.log('\nTesting New Game button...');
      await page.click('#newGameBtn');
      await page.waitForTimeout(3000);
      
      console.log('✅ New Game button clicked successfully!');
      
    } else {
      console.log('\n❌ FAILED: Game did not initialize properly');
      console.log('Console messages:', consoleMessages);
      console.log('Errors:', errors);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/evanluchs/gridgameweb/test-deploy-fix-screenshot.png', 
      fullPage: true 
    });
    console.log('\nScreenshot saved to test-deploy-fix-screenshot.png');
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testDeploymentFix().catch(console.error);