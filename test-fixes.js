/**
 * Test script to verify implemented fixes
 * This script tests base positions, unit building, and build UI functionality
 */

import { GameState } from './public/gameState.js';
import { BASE_CONFIG, UNIT_TYPES } from './shared/constants.js';

console.log('🔧 Testing implemented fixes...\n');

// Test Results Container
const results = {
    basePositions: false,
    unitBuildingPlayer1: false,
    unitBuildingPlayer2: false,
    baseRadiusValidation: false,
    unitPlacementRestrictions: false,
    errorCount: 0
};

try {
    // Test 1: Verify base positions are correct
    console.log('1. Testing base positions...');
    const gameState = new GameState();
    
    const player1Base = gameState.getPlayerBase(1);
    const player2Base = gameState.getPlayerBase(2);
    
    const expected1 = BASE_CONFIG.STARTING_POSITIONS[1]; // (1,23)
    const expected2 = BASE_CONFIG.STARTING_POSITIONS[2]; // (23,1)
    
    if (player1Base && player1Base.position.x === expected1.x && player1Base.position.y === expected1.y) {
        console.log('✅ Player 1 base correctly positioned at (1,23)');
        if (player2Base && player2Base.position.x === expected2.x && player2Base.position.y === expected2.y) {
            console.log('✅ Player 2 base correctly positioned at (23,1)');
            results.basePositions = true;
        } else {
            console.log('❌ Player 2 base position incorrect');
            console.log('   Expected:', expected2, 'Got:', player2Base?.position);
        }
    } else {
        console.log('❌ Player 1 base position incorrect');
        console.log('   Expected:', expected1, 'Got:', player1Base?.position);
    }

    // Test 2: Test unit building for Player 1
    console.log('\n2. Testing unit building for Player 1...');
    const player1BasePos = player1Base.position;
    const nearX1 = player1BasePos.x + 1;
    const nearY1 = player1BasePos.y - 1; // Valid position near base
    
    const unit1 = gameState.createUnit('worker', 1, nearX1, nearY1);
    if (unit1) {
        console.log('✅ Player 1 can build units near their base');
        console.log(`   Worker created at (${nearX1},${nearY1})`);
        results.unitBuildingPlayer1 = true;
    } else {
        console.log('❌ Player 1 cannot build units near their base');
    }

    // Test 3: Test unit building for Player 2
    console.log('\n3. Testing unit building for Player 2...');
    const player2BasePos = player2Base.position;
    const nearX2 = player2BasePos.x - 1;
    const nearY2 = player2BasePos.y + 1; // Valid position near base
    
    const unit2 = gameState.createUnit('scout', 2, nearX2, nearY2);
    if (unit2) {
        console.log('✅ Player 2 can build units near their base');
        console.log(`   Scout created at (${nearX2},${nearY2})`);
        results.unitBuildingPlayer2 = true;
    } else {
        console.log('❌ Player 2 cannot build units near their base');
    }

    // Test 4: Test base radius validation
    console.log('\n4. Testing base radius validation...');
    
    // Test valid positions (within radius)
    const validPos1 = gameState.isWithinBaseRadius(1, player1BasePos.x + 2, player1BasePos.y + 1);
    const validPos2 = gameState.isWithinBaseRadius(2, player2BasePos.x - 2, player2BasePos.y - 1);
    
    // Test invalid positions (outside radius)
    const invalidPos1 = gameState.isWithinBaseRadius(1, player1BasePos.x + 10, player1BasePos.y + 10);
    const invalidPos2 = gameState.isWithinBaseRadius(2, player2BasePos.x - 10, player2BasePos.y - 10);
    
    if (validPos1 && validPos2 && !invalidPos1 && !invalidPos2) {
        console.log('✅ Base radius validation working correctly');
        results.baseRadiusValidation = true;
    } else {
        console.log('❌ Base radius validation not working correctly');
        console.log(`   Valid positions: P1=${validPos1}, P2=${validPos2}`);
        console.log(`   Invalid positions: P1=${invalidPos1}, P2=${invalidPos2}`);
    }

    // Test 5: Test unit placement restrictions
    console.log('\n5. Testing unit placement restrictions...');
    
    // Try to build unit far from base (should fail)
    const farFromBase = gameState.createUnit('infantry', 1, 15, 15);
    
    // Try to build unit on base position (should fail)
    const onBase = gameState.createUnit('heavy', 1, player1BasePos.x, player1BasePos.y);
    
    if (!farFromBase && !onBase) {
        console.log('✅ Unit placement restrictions working correctly');
        console.log('   Units cannot be placed far from base or on base position');
        results.unitPlacementRestrictions = true;
    } else {
        console.log('❌ Unit placement restrictions not working');
        console.log(`   Far from base result: ${farFromBase ? 'ALLOWED (should be blocked)' : 'BLOCKED (correct)'}`);
        console.log(`   On base result: ${onBase ? 'ALLOWED (should be blocked)' : 'BLOCKED (correct)'}`);
    }

    // Test 6: Verify unit types are available
    console.log('\n6. Testing unit types availability...');
    const unitTypes = ['worker', 'scout', 'infantry', 'heavy'];
    let allTypesWork = true;
    
    unitTypes.forEach(unitType => {
        const testUnit = gameState.createUnit(unitType, 1, player1BasePos.x + 1, player1BasePos.y + 1);
        if (!testUnit) {
            console.log(`❌ Unit type '${unitType}' failed to create`);
            allTypesWork = false;
        } else {
            console.log(`✅ Unit type '${unitType}' works correctly`);
        }
    });

} catch (error) {
    console.error('❌ Test error:', error);
    results.errorCount++;
}

// Final Results Summary
console.log('\n📊 TEST RESULTS SUMMARY');
console.log('========================');
console.log(`Base Positions Correct: ${results.basePositions ? '✅' : '❌'}`);
console.log(`Player 1 Unit Building: ${results.unitBuildingPlayer1 ? '✅' : '❌'}`);
console.log(`Player 2 Unit Building: ${results.unitBuildingPlayer2 ? '✅' : '❌'}`);
console.log(`Base Radius Validation: ${results.baseRadiusValidation ? '✅' : '❌'}`);
console.log(`Unit Placement Restrictions: ${results.unitPlacementRestrictions ? '✅' : '❌'}`);
console.log(`Errors Encountered: ${results.errorCount}`);

const passedTests = Object.values(results).filter(val => val === true).length;
const totalTests = Object.keys(results).length - 1; // Subtract errorCount
console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests && results.errorCount === 0) {
    console.log('🎉 All fixes working correctly!');
} else {
    console.log('⚠️  Some issues remain to be addressed');
}