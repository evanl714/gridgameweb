/**
 * Movement System Performance Tests
 * Tests performance characteristics and memory usage of the movement system
 */

import { GameState, Unit } from '../public/gameState.js';

describe('Movement System Performance Tests', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
    gameState.startGame();
  });

  describe('Large Scale Performance', () => {
    test('should handle 100+ units efficiently', () => {
      const startTime = performance.now();

      // Create 100 units across the grid
      const units = [];
      for (let i = 0; i < 100; i++) {
        const x = i % 25;
        const y = Math.floor(i / 25);
        if (gameState.isPositionEmpty(x, y)) {
          const unit = gameState.createUnit('worker', (i % 2) + 1, x, y);
          if (unit) units.push(unit);
        }
      }

      const creationTime = performance.now() - startTime;
      expect(creationTime).toBeLessThan(100); // Should create quickly
      expect(units.length).toBeGreaterThan(80); // Should create most units

      // Test movement range calculations for all units
      const rangeStartTime = performance.now();
      units.forEach((unit) => {
        gameState.getValidMovePositions(unit.id);
      });
      const rangeTime = performance.now() - rangeStartTime;

      expect(rangeTime).toBeLessThan(200); // Should calculate ranges quickly
    });

    test('should maintain performance with repeated operations', () => {
      // Create some units
      const units = [];
      for (let i = 0; i < 20; i++) {
        const x = (i % 5) * 5;
        const y = Math.floor(i / 5) * 5;
        units.push(gameState.createUnit('scout', 1, x, y));
      }

      const startTime = performance.now();

      // Perform 1000 movement-related operations
      for (let i = 0; i < 1000; i++) {
        const unit = units[i % units.length];
        if (unit) {
          // Mix of operations
          gameState.getValidMovePositions(unit.id);
          gameState.calculateMovementCost(
            unit.id,
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25),
          );
          gameState.canUnitMoveTo(
            unit.id,
            Math.floor(Math.random() * 25),
            Math.floor(Math.random() * 25),
          );
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500); // Should complete in reasonable time
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory with unit creation/removal cycles', () => {
      const initialUnitCount = gameState.units.size;
      const initialPlayerUnits = gameState.players.get(1).unitsOwned.size;

      // Create and remove units multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        const createdUnits = [];

        // Create units
        for (let i = 0; i < 10; i++) {
          const x = (i % 5) + (cycle % 3);
          const y = Math.floor(i / 5) + Math.floor(cycle / 3);
          if (gameState.isPositionEmpty(x, y)) {
            const unit = gameState.createUnit('worker', 1, x, y);
            if (unit) createdUnits.push(unit.id);
          }
        }

        // Remove all created units
        createdUnits.forEach((unitId) => {
          gameState.removeUnit(unitId);
        });
      }

      // Should return to initial state
      expect(gameState.units.size).toBe(initialUnitCount);
      expect(gameState.players.get(1).unitsOwned.size).toBe(initialPlayerUnits);

      // Board should be clean
      let occupiedCells = 0;
      for (let x = 0; x < 25; x++) {
        for (let y = 0; y < 25; y++) {
          if (gameState.board[x][y] !== null) {
            occupiedCells++;
          }
        }
      }
      expect(occupiedCells).toBe(initialUnitCount);
    });

    test('should handle movement state efficiently', () => {
      const unit = gameState.createUnit('scout', 1, 12, 12);

      // Simulate many movement state changes
      const stateChanges = 1000;
      const startTime = performance.now();

      for (let i = 0; i < stateChanges; i++) {
        // Change movement state
        unit.resetActions();
        unit.useAction();

        // Calculate ranges (common UI operation)
        gameState.getValidMovePositions(unit.id);

        // Test movement validation
        gameState.canUnitMoveTo(unit.id, 12 + (i % 3) - 1, 12 + (i % 3) - 1);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should be very fast
      expect(unit.position.x).toBe(12); // Position should be unchanged
      expect(unit.position.y).toBe(12);
    });
  });

  describe('Grid Scale Performance', () => {
    test('should handle edge positions efficiently', () => {
      // Test performance at grid boundaries
      const edgePositions = [
        { x: 0, y: 0 },
        { x: 24, y: 0 },
        { x: 0, y: 24 },
        { x: 24, y: 24 },
        { x: 0, y: 12 },
        { x: 24, y: 12 },
        { x: 12, y: 0 },
        { x: 12, y: 24 },
      ];

      const startTime = performance.now();

      edgePositions.forEach((pos, index) => {
        const unit = gameState.createUnit(
          'worker',
          (index % 2) + 1,
          pos.x,
          pos.y,
        );
        if (unit) {
          // Test movement calculations from edge positions
          for (let i = 0; i < 100; i++) {
            gameState.getValidMovePositions(unit.id);
            gameState.calculateMovementCost(
              unit.id,
              Math.floor(Math.random() * 25),
              Math.floor(Math.random() * 25),
            );
          }
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200); // Should handle edge cases efficiently
    });

    test('should scale well with grid density', () => {
      // Fill the grid with many units
      const units = [];
      for (let x = 0; x < 25; x += 2) {
        for (let y = 0; y < 25; y += 2) {
          const unit = gameState.createUnit('worker', ((x + y) % 2) + 1, x, y);
          if (unit) units.push(unit);
        }
      }

      expect(units.length).toBeGreaterThan(100); // Dense grid

      const startTime = performance.now();

      // Test movement calculations with dense grid
      units.slice(0, 50).forEach((unit) => {
        gameState.getValidMovePositions(unit.id);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(150); // Should handle density well
    });
  });

  describe('Event System Performance', () => {
    test('should handle movement events efficiently', () => {
      const eventsFired = [];

      // Listen to movement events
      gameState.on('unitMoved', (data) => {
        eventsFired.push(data);
      });

      const unit = gameState.createUnit('scout', 1, 10, 10);
      const startTime = performance.now();

      // Perform many movements
      for (let i = 0; i < 50; i++) {
        const targetX = 10 + (i % 3) - 1;
        const targetY = 10 + (Math.floor(i / 3) % 3) - 1;

        if (
          gameState.isValidPosition(targetX, targetY) &&
          gameState.isPositionEmpty(targetX, targetY)
        ) {
          gameState.moveUnit(unit.id, targetX, targetY);
        }

        // Reset actions occasionally
        if (i % 5 === 0) {
          unit.resetActions();
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(50); // Event handling should be fast
      expect(eventsFired.length).toBeGreaterThan(0); // Events should fire
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle simultaneous movement calculations', async () => {
      // Create multiple units
      const units = [];
      for (let i = 0; i < 20; i++) {
        const x = (i % 4) * 6;
        const y = Math.floor(i / 4) * 6;
        units.push(gameState.createUnit('scout', (i % 2) + 1, x, y));
      }

      const startTime = performance.now();

      // Simulate concurrent operations
      const promises = units.map(async (unit, index) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            // Simulate user interactions
            for (let i = 0; i < 10; i++) {
              gameState.getValidMovePositions(unit.id);
              gameState.calculateMovementCost(
                unit.id,
                Math.floor(Math.random() * 25),
                Math.floor(Math.random() * 25),
              );
            }
            resolve();
          }, index * 10); // Stagger operations
        });
      });

      await Promise.all(promises);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete within reasonable time
    });
  });

  describe('Stress Testing', () => {
    test('should survive extreme usage patterns', () => {
      const unit = gameState.createUnit('heavy', 1, 12, 12);
      let operationCount = 0;
      const startTime = performance.now();

      // Extreme usage pattern
      while (performance.now() - startTime < 100) {
        // 100ms stress test
        gameState.getValidMovePositions(unit.id);
        gameState.canUnitMoveTo(
          unit.id,
          Math.floor(Math.random() * 25),
          Math.floor(Math.random() * 25),
        );
        operationCount++;
      }

      expect(operationCount).toBeGreaterThan(100); // Should complete many operations
      expect(unit.position.x).toBe(12); // Unit should be intact
      expect(unit.position.y).toBe(12);
      expect(gameState.units.has(unit.id)).toBe(true); // Unit should still exist
    });

    test('should maintain accuracy under stress', () => {
      const unit = gameState.createUnit('worker', 1, 10, 10);
      const results = [];

      // Perform same calculation many times
      for (let i = 0; i < 1000; i++) {
        const validMoves = gameState.getValidMovePositions(unit.id);
        results.push(validMoves.length);
      }

      // All results should be identical (deterministic)
      const firstResult = results[0];
      const allSame = results.every((result) => result === firstResult);
      expect(allSame).toBe(true);

      // Result should be reasonable for worker (2 movement)
      expect(firstResult).toBeGreaterThan(0);
      expect(firstResult).toBeLessThan(25); // Can't reach all squares
    });
  });
});

describe('Movement System Resource Management', () => {
  test('should not accumulate unnecessary data structures', () => {
    const gameState = new GameState();
    gameState.startGame();

    const initialMemoryEstimate = JSON.stringify(gameState.serialize()).length;

    // Perform many operations that might accumulate data
    for (let i = 0; i < 100; i++) {
      const unit = gameState.createUnit(
        'worker',
        1,
        5 + (i % 3),
        5 + Math.floor(i % 3),
      );
      if (unit) {
        gameState.getValidMovePositions(unit.id);
        gameState.removeUnit(unit.id);
      }
    }

    const finalMemoryEstimate = JSON.stringify(gameState.serialize()).length;

    // Memory usage should not grow significantly
    const memoryGrowth = finalMemoryEstimate - initialMemoryEstimate;
    expect(memoryGrowth).toBeLessThan(initialMemoryEstimate * 0.1); // Less than 10% growth
  });
});
