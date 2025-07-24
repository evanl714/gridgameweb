// Unit Building System Test Script
// This script tests the unit building functionality

async function testUnitBuildingSystem() {
  console.log('🔧 Starting Unit Building System Tests...');

  // Wait for game to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const results = {
    gameLoaded: false,
    buildPanelExists: false,
    unitCardsExist: false,
    buildPanelShowWorks: false,
    activeStylingWorks: false,
    unitBuildingWorks: false,
    consoleErrors: [],
    phaseTransitionWorks: false
  };

  try {
    // Test 1: Check if game loaded
    results.gameLoaded = typeof window.gameInstance !== 'undefined';
    console.log('✅ Game loaded:', results.gameLoaded);

    // Test 2: Check if buildPanel exists
    results.buildPanelExists = typeof window.buildPanel !== 'undefined';
    console.log('✅ Build panel exists:', results.buildPanelExists);

    // Test 3: Check if unit cards exist
    const unitCards = document.querySelectorAll('.unit-card');
    results.unitCardsExist = unitCards.length > 0;
    console.log('✅ Unit cards exist:', results.unitCardsExist, `(${unitCards.length} found)`);

    if (results.buildPanelExists) {
      // Test 4: Test buildPanel.show() method
      try {
        window.buildPanel.show();
        results.buildPanelShowWorks = true;
        console.log('✅ buildPanel.show() works without errors');

        // Test 5: Check active state styling
        const buildPanelElement = document.getElementById('buildPanel');
        if (buildPanelElement) {
          const hasActiveClass = buildPanelElement.classList.contains('active');
          results.activeStylingWorks = hasActiveClass;
          console.log('✅ Active styling works:', hasActiveClass);
        }

        // Test 6: Test unit card clicks and building
        if (unitCards.length > 0) {
          console.log('🔧 Testing unit card interaction...');

          // Click on Worker unit card
          const workerCard = document.querySelector('[data-unit-type="Worker"]');
          if (workerCard) {
            workerCard.click();
            console.log('✅ Worker card clicked');

            // Check if card becomes selected
            const isSelected = workerCard.classList.contains('selected');
            console.log('✅ Worker card selection state:', isSelected);

            // Try to place unit on grid (simulate click on grid position)
            const gridCells = document.querySelectorAll('.grid-cell');
            if (gridCells.length > 0) {
              const firstEmptyCell = Array.from(gridCells).find(cell => !cell.querySelector('.unit'));
              if (firstEmptyCell) {
                firstEmptyCell.click();
                console.log('✅ Grid cell clicked for unit placement');

                // Check if unit was actually placed
                setTimeout(() => {
                  const unitPlaced = firstEmptyCell.querySelector('.unit');
                  results.unitBuildingWorks = !!unitPlaced;
                  console.log('✅ Unit building works:', results.unitBuildingWorks);
                }, 1000);
              }
            }
          }
        }

        // Test 7: Test phase transition and panel deactivation
        console.log('🔧 Testing phase transition...');
        if (window.gameInstance && window.gameInstance.nextPhase) {
          const currentPhase = window.gameInstance.currentPhase;
          console.log('Current phase:', currentPhase);

          // Try to switch to a different phase
          if (currentPhase !== 'Move') {
            // Switch to Move phase to test deactivation
            const movePhaseBtn = document.querySelector('[data-phase="Move"]');
            if (movePhaseBtn) {
              movePhaseBtn.click();
              setTimeout(() => {
                const buildPanelElement = document.getElementById('buildPanel');
                const isStillActive = buildPanelElement && buildPanelElement.classList.contains('active');
                results.phaseTransitionWorks = !isStillActive;
                console.log('✅ Build panel deactivates on phase change:', results.phaseTransitionWorks);
              }, 500);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error testing buildPanel.show():', error);
        results.consoleErrors.push(error.message);
      }
    }

    // Capture any console errors
    const originalError = console.error;
    console.error = function(...args) {
      results.consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };

  } catch (error) {
    console.error('❌ Test error:', error);
    results.consoleErrors.push(error.message);
  }

  // Final results
  setTimeout(() => {
    console.log('\n📊 UNIT BUILDING TEST RESULTS:');
    console.log('================================');
    Object.entries(results).forEach(([key, value]) => {
      if (key === 'consoleErrors') {
        console.log(`${key}: ${value.length} errors found`);
        value.forEach(error => console.log(`  - ${error}`));
      } else {
        console.log(`${key}: ${value ? '✅' : '❌'}`);
      }
    });
    console.log('================================');

    // Store results globally for inspection
    window.testResults = results;
  }, 3000);
}

// Auto-run test when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testUnitBuildingSystem);
} else {
  testUnitBuildingSystem();
}
