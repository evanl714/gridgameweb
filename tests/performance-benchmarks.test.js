/**
 * Performance Benchmarking and Monitoring Suite
 * Implements systematic performance testing and validation benchmarks
 * Based on Task 13 requirements and performance testing best practices
 */

import { GameState } from '../public/gameState.js';
import { TurnManager } from '../public/turnManager.js';
import { ResourceManager } from '../public/resourceManager.js';
import { TestDataFactory, TestScenarios } from './testUtilities.js';
import { GAME_CONFIG } from '../shared/constants.js';

describe('Performance Benchmarks and Monitoring', () => {
  let gameState;
  let turnManager;
  let resourceManager;

  beforeEach(() => {
    gameState = new GameState();
    turnManager = new TurnManager(gameState);
    resourceManager = new ResourceManager(gameState);
    gameState.startGame();
  });

  describe('Core Operation Benchmarks', () => {
    test('should meet movement calculation performance targets', () => {
      const units = TestDataFactory.createMultipleUnits(gameState, 'scout', 1, 10);
      expect(units.length).toBeGreaterThan(5);

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        units.forEach(unit => {
          if (unit) {
            gameState.getValidMovePositions(unit.id);
          }
        });
      }

      const totalTime = performance.now() - startTime;
      const avgTimePerCalculation = totalTime / (iterations * units.length);

      // Performance targets based on browser game requirements
      expect(avgTimePerCalculation).toBeLessThan(1); // < 1ms per calculation
      expect(totalTime).toBeLessThan(100); // Total under 100ms

      console.log(`Movement calculation: ${avgTimePerCalculation.toFixed(3)}ms avg`);
    });

    test('should meet combat calculation performance targets', () => {
      const { attacker, defender } = TestScenarios.setupCombatScenario(gameState);
      if (!attacker || !defender) {
        console.log('Skipping combat benchmark - could not create scenario');
        return;
      }

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        gameState.canUnitAttack(attacker.id, defender.position.x, defender.position.y);
        gameState.getValidAttackTargets(attacker.id);
      }

      const totalTime = performance.now() - startTime;
      const avgTimePerCalculation = totalTime / (iterations * 2);

      expect(avgTimePerCalculation).toBeLessThan(0.5); // < 0.5ms per calculation
      expect(totalTime).toBeLessThan(200);

      console.log(`Combat calculation: ${avgTimePerCalculation.toFixed(3)}ms avg`);
    });

    test('should meet resource management performance targets', () => {
      const workers = [];
      for (let i = 0; i < 5; i++) {
        const worker = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
        if (worker) workers.push(worker);
      }

      const iterations = 200;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        workers.forEach(worker => {
          if (worker) {
            resourceManager.canGatherAtPosition(worker.id);
            resourceManager.getResourceNodesInRange(worker.position.x, worker.position.y, 1);
          }
        });
      }

      const totalTime = performance.now() - startTime;
      const avgTimePerCalculation = totalTime / (iterations * workers.length * 2);

      expect(avgTimePerCalculation).toBeLessThan(0.3); // < 0.3ms per calculation
      expect(totalTime).toBeLessThan(150);

      console.log(`Resource calculation: ${avgTimePerCalculation.toFixed(3)}ms avg`);
    });
  });

  describe('Scalability Benchmarks', () => {
    test('should scale efficiently with unit count', () => {
      const unitCounts = [5, 10, 15, 20];
      const results = [];

      unitCounts.forEach(count => {
        const units = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, count);
        
        const startTime = performance.now();
        
        // Perform common operations
        units.forEach(unit => {
          if (unit) {
            gameState.getValidMovePositions(unit.id);
            gameState.getValidAttackTargets(unit.id);
          }
        });

        const totalTime = performance.now() - startTime;
        const timePerUnit = totalTime / units.length;

        results.push({ count: units.length, timePerUnit });

        // Clean up for next iteration
        units.forEach(unit => {
          if (unit) gameState.removeUnit(unit.id);
        });
      });

      // Verify scalability (time per unit should not increase dramatically)
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      const scalabilityFactor = lastResult.timePerUnit / firstResult.timePerUnit;

      expect(scalabilityFactor).toBeLessThan(3); // Should not degrade more than 3x

      console.log('Scalability results:', results.map(r => 
        `${r.count} units: ${r.timePerUnit.toFixed(3)}ms/unit`
      ).join(', '));
    });

    test('should handle high-frequency operations efficiently', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'scout', 1);
      if (!unit) return;

      const operationsPerSecond = 1000; // Target 1000 ops/sec
      const testDurationMs = 100; // Test for 100ms
      
      const startTime = performance.now();
      let operationCount = 0;

      while ((performance.now() - startTime) < testDurationMs) {
        gameState.getValidMovePositions(unit.id);
        operationCount++;
      }

      const actualDuration = performance.now() - startTime;
      const actualOpsPerSecond = (operationCount / actualDuration) * 1000;

      expect(actualOpsPerSecond).toBeGreaterThan(operationsPerSecond * 0.8); // 80% of target

      console.log(`High-frequency ops: ${actualOpsPerSecond.toFixed(0)} ops/sec`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should not accumulate memory during gameplay cycles', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Simulate intensive gameplay
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create units
        const units = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, 10);
        
        // Perform operations
        units.forEach(unit => {
          if (unit) {
            gameState.getValidMovePositions(unit.id);
            unit.useAction();
          }
        });

        // Clean up
        units.forEach(unit => {
          if (unit) gameState.removeUnit(unit.id);
        });

        // Force garbage collection hint
        if (global.gc) global.gc();
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      if (performance.memory) {
        const memoryGrowth = finalMemory - initialMemory;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);
        
        // Should not grow by more than 5MB during cycles
        expect(memoryGrowthMB).toBeLessThan(5);
        
        console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
      }
    });

    test('should efficiently cleanup removed entities', () => {
      const initialUnitCount = gameState.units.size;
      const unitsToCreate = 20;

      // Create many units
      const units = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, unitsToCreate);
      expect(gameState.units.size).toBeGreaterThan(initialUnitCount);

      // Remove all created units
      const startTime = performance.now();
      units.forEach(unit => {
        if (unit) gameState.removeUnit(unit.id);
      });
      const cleanupTime = performance.now() - startTime;

      // Verify cleanup
      expect(gameState.units.size).toBe(initialUnitCount);
      expect(cleanupTime).toBeLessThan(10); // Should cleanup quickly

      // Verify board cleanup
      let orphanedBoardCells = 0;
      for (let x = 0; x < GAME_CONFIG.GRID_SIZE; x++) {
        for (let y = 0; y < GAME_CONFIG.GRID_SIZE; y++) {
          const cellContent = gameState.board[x][y];
          if (cellContent && !gameState.units.has(cellContent) && !gameState.bases.has(cellContent)) {
            orphanedBoardCells++;
          }
        }
      }

      expect(orphanedBoardCells).toBe(0);
      console.log(`Cleanup time: ${cleanupTime.toFixed(2)}ms for ${units.length} units`);
    });
  });

  describe('Stress Testing Benchmarks', () => {
    test('should survive intensive concurrent operations', () => {
      const units = TestDataFactory.createMultipleUnits(gameState, 'scout', 1, 15);
      expect(units.length).toBeGreaterThan(10);

      const concurrentOperations = 50;
      const startTime = performance.now();

      // Simulate concurrent user interactions
      for (let i = 0; i < concurrentOperations; i++) {
        units.forEach(unit => {
          if (unit && unit.canAct()) {
            // Mix of different operations
            gameState.getValidMovePositions(unit.id);
            gameState.getValidAttackTargets(unit.id);
            gameState.calculateMovementCost(
              unit.id,
              Math.min(24, unit.position.x + 1),
              Math.min(24, unit.position.y + 1)
            );
          }
        });
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(500); // Should handle stress within 500ms

      // Verify game state integrity
      expect(gameState.units.size).toBeGreaterThan(10);
      expect(gameState.status).toBe('playing');

      console.log(`Stress test: ${concurrentOperations * units.length * 3} operations in ${totalTime.toFixed(2)}ms`);
    });

    test('should maintain accuracy under performance pressure', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      if (!unit) return;

      const referenceResult = gameState.getValidMovePositions(unit.id);
      const iterations = 1000;

      // Perform same calculation many times under time pressure
      const results = [];
      for (let i = 0; i < iterations; i++) {
        const result = gameState.getValidMovePositions(unit.id);
        results.push(result.length);
      }

      // All results should be identical (deterministic)
      const uniqueResults = [...new Set(results)];
      expect(uniqueResults.length).toBe(1);
      expect(uniqueResults[0]).toBe(referenceResult.length);

      console.log(`Consistency test: ${iterations} iterations, all returned ${referenceResult.length} moves`);
    });
  });

  describe('Real-world Performance Simulation', () => {
    test('should handle typical gameplay session performance', () => {
      const sessionDurationMs = 200; // Simulate 200ms of gameplay
      const targetFPS = 60;
      const frameTimeMs = 1000 / targetFPS;

      const units = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, 8);
      const sessionStartTime = performance.now();
      let frameCount = 0;
      let totalFrameTime = 0;

      while ((performance.now() - sessionStartTime) < sessionDurationMs) {
        const frameStart = performance.now();

        // Simulate typical frame operations
        units.forEach(unit => {
          if (unit) {
            // UI queries that happen every frame
            gameState.getValidMovePositions(unit.id);
            
            // Resource calculations
            if (unit.type === 'worker') {
              resourceManager.canGatherAtPosition(unit.id);
            }
          }
        });

        const frameTime = performance.now() - frameStart;
        totalFrameTime += frameTime;
        frameCount++;

        // Target frame time budget
        if (frameTime > frameTimeMs) {
          console.warn(`Frame ${frameCount} exceeded budget: ${frameTime.toFixed(2)}ms`);
        }
      }

      const avgFrameTime = totalFrameTime / frameCount;
      const achievedFPS = 1000 / avgFrameTime;

      expect(avgFrameTime).toBeLessThan(frameTimeMs * 1.5); // Within 150% of target
      expect(achievedFPS).toBeGreaterThan(targetFPS * 0.8); // At least 80% of target FPS

      console.log(`Session performance: ${achievedFPS.toFixed(1)} FPS avg (${avgFrameTime.toFixed(2)}ms/frame)`);
    });

    test('should handle turn transition performance', () => {
      const turnsToSimulate = 20;
      const turnTimes = [];

      for (let turn = 0; turn < turnsToSimulate; turn++) {
        const turnStart = performance.now();
        
        // Create some activity during turn
        const unit = TestDataFactory.createValidUnit(gameState, 'worker', gameState.currentPlayer);
        if (unit) {
          // Perform typical turn actions
          gameState.getValidMovePositions(unit.id);
          unit.useAction();
        }

        // End turn
        turnManager.forceEndTurn();
        
        const turnTime = performance.now() - turnStart;
        turnTimes.push(turnTime);
      }

      const avgTurnTime = turnTimes.reduce((a, b) => a + b, 0) / turnTimes.length;
      const maxTurnTime = Math.max(...turnTimes);

      expect(avgTurnTime).toBeLessThan(10); // Average turn should be under 10ms
      expect(maxTurnTime).toBeLessThan(50); // No turn should exceed 50ms

      console.log(`Turn performance: ${avgTurnTime.toFixed(2)}ms avg, ${maxTurnTime.toFixed(2)}ms max`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regressions in core operations', () => {
      // Baseline performance measurements (these would be updated as targets change)
      const performanceTargets = {
        movementCalculation: 1.0, // ms
        combatValidation: 0.5,    // ms
        resourceChecking: 0.3,    // ms
        unitCreation: 2.0,        // ms
        turnTransition: 10.0      // ms
      };

      const unit = TestDataFactory.createValidUnit(gameState, 'scout', 1);
      if (!unit) return;

      // Movement calculation benchmark
      const movementStart = performance.now();
      gameState.getValidMovePositions(unit.id);
      const movementTime = performance.now() - movementStart;

      // Combat validation benchmark
      const combatStart = performance.now();
      gameState.getValidAttackTargets(unit.id);
      const combatTime = performance.now() - combatStart;

      // Resource checking benchmark
      const resourceStart = performance.now();
      resourceManager.canGatherAtPosition(unit.id);
      const resourceTime = performance.now() - resourceStart;

      // Unit creation benchmark
      const creationStart = performance.now();
      const newUnit = TestDataFactory.createValidUnit(gameState, 'worker', 2);
      const creationTime = performance.now() - creationStart;

      // Turn transition benchmark
      const turnStart = performance.now();
      turnManager.forceEndTurn();
      const turnTime = performance.now() - turnStart;

      // Verify against targets (allow 50% margin for test environment variations)
      expect(movementTime).toBeLessThan(performanceTargets.movementCalculation * 1.5);
      expect(combatTime).toBeLessThan(performanceTargets.combatValidation * 1.5);
      expect(resourceTime).toBeLessThan(performanceTargets.resourceChecking * 1.5);
      expect(creationTime).toBeLessThan(performanceTargets.unitCreation * 1.5);
      expect(turnTime).toBeLessThan(performanceTargets.turnTransition * 1.5);

      console.log('Performance regression check:', {
        movement: `${movementTime.toFixed(3)}ms (target: ${performanceTargets.movementCalculation}ms)`,
        combat: `${combatTime.toFixed(3)}ms (target: ${performanceTargets.combatValidation}ms)`,
        resource: `${resourceTime.toFixed(3)}ms (target: ${performanceTargets.resourceChecking}ms)`,
        creation: `${creationTime.toFixed(3)}ms (target: ${performanceTargets.unitCreation}ms)`,
        turn: `${turnTime.toFixed(3)}ms (target: ${performanceTargets.turnTransition}ms)`
      });
    });
  });
});