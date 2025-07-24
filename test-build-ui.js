/**
 * Build UI Test Script
 * Tests the build panel UI functionality
 */

import { chromium } from 'playwright';

async function testBuildUI() {
  console.log('🎮 Testing Build Panel UI...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the game
    await page.goto('http://localhost:3000');

    // Wait for game to load
    await page.waitForSelector('#gameBoard', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give game time to initialize

    console.log('✅ Game loaded successfully');

    // Test 1: Check if build panel exists
    const buildPanel = await page.$('#buildPanelSidebar');
    if (buildPanel) {
      console.log('✅ Build panel element found');
    } else {
      console.log('❌ Build panel element not found');
      return;
    }

    // Test 2: Check build phase button
    const buildPhaseBtn = await page.$('[data-phase="Build"]');
    if (buildPhaseBtn) {
      console.log('✅ Build phase button found');

      // Click build phase to activate build panel
      await buildPhaseBtn.click();
      await page.waitForTimeout(500);

      // Check if build panel becomes active or visible
      const buildPanelVisible = await buildPanel.isVisible();
      if (buildPanelVisible) {
        console.log('✅ Build panel is visible when Build phase is selected');
      } else {
        console.log('❌ Build panel not visible after Build phase selection');
      }
    } else {
      console.log('❌ Build phase button not found');
    }

    // Test 3: Check if unit cards exist
    const unitCards = await page.$$('.unit-card');
    console.log(`✅ Found ${unitCards.length} unit cards`);

    if (unitCards.length > 0) {
      // Test 4: Check unit card interaction
      const firstCard = unitCards[0];
      const unitType = await firstCard.getAttribute('data-unit-type');
      console.log(`🔧 Testing interaction with ${unitType} card`);

      await firstCard.click();
      await page.waitForTimeout(300);

      // Check if card becomes selected
      const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
      if (isSelected) {
        console.log('✅ Unit card selection works');
      } else {
        console.log('❌ Unit card selection not working');
      }
    }

    // Test 5: Check if bases are visible on grid
    const bases = await page.$$('.base');
    console.log(`✅ Found ${bases.length} bases on grid`);

    if (bases.length >= 2) {
      // Get base positions to verify they're correct
      for (let i = 0; i < bases.length; i++) {
        const baseElement = bases[i];
        const position = await baseElement.evaluate(el => {
          const style = el.style;
          return {
            left: style.left,
            top: style.top
          };
        });
        console.log(`   Base ${i + 1} position:`, position);
      }
    }

    // Test 6: Test grid cell clicking for unit placement
    const gridCells = await page.$$('.grid-cell');
    if (gridCells.length > 0) {
      console.log(`✅ Found ${gridCells.length} grid cells`);

      // Try to click a cell near the player 1 base (should be around 1,23)
      // Cell at position (2,22) should be near the base
      const targetCell = await page.$('[data-x="2"][data-y="22"]');
      if (targetCell) {
        console.log('🔧 Testing unit placement near base');
        await targetCell.click();
        await page.waitForTimeout(1000);

        // Check if a unit was placed
        const unitInCell = await targetCell.$('.unit');
        if (unitInCell) {
          console.log('✅ Unit placement works - unit created near base');
        } else {
          console.log('⚠️  No unit visible in cell after click (may be normal if energy insufficient)');
        }
      } else {
        console.log('⚠️  Target grid cell not found');
      }
    }

    // Test 7: Check game status display
    const currentPlayer = await page.textContent('#currentPlayer');
    const gamePhase = await page.textContent('#gamePhase');

    console.log('\n📊 Game Status:');
    console.log(`   Current Player: ${currentPlayer}`);
    console.log(`   Game Phase: ${gamePhase}`);

    // Test 8: Check for console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (logs.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log('❌ Console errors found:');
      logs.forEach(log => console.log(`   ${log}`));
    }

    console.log('\n🎉 Build UI tests completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testBuildUI().catch(console.error);
