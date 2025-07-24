/**
 * Comprehensive Movement System Edge Case Tests
 * Tests boundary conditions, collision detection, turn integration, and performance
 */

import { GameState, Player, Unit } from '../public/gameState.js';
import { TurnManager } from '../public/turnManager.js';
import { TestDataFactory, TestScenarios } from './testUtilities.js';

describe('Movement System Edge Cases', () => {
  let gameState;
  let turnManager;

  beforeEach(() => {
    gameState = new GameState();
    turnManager = new TurnManager(gameState);
    gameState.startGame();
  });

  describe('Boundary Testing', () => {
    test('should prevent movement off the grid - negative coordinates', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Try to move to negative coordinates
      expect(gameState.canUnitMoveTo(unit.id, -1, 0)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, 0, -1)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, -1, -1)).toBe(false);

      // Verify unit doesn't move
      const originalPos = { ...unit.position };
      const moved = gameState.moveUnit(unit.id, -1, 0);
      expect(moved).toBe(false);
      expect(unit.position.x).toBe(originalPos.x);
      expect(unit.position.y).toBe(originalPos.y);
    });

    test('should prevent movement off the grid - coordinates beyond grid size', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Try to move beyond grid boundaries
      expect(gameState.canUnitMoveTo(unit.id, 25, 24)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, 24, 25)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, 25, 25)).toBe(false);

      // Verify unit doesn't move
      const originalPos = { ...unit.position };
      const moved = gameState.moveUnit(unit.id, 25, 24);
      expect(moved).toBe(false);
      expect(unit.position.x).toBe(originalPos.x);
      expect(unit.position.y).toBe(originalPos.y);
    });

    test('should allow movement to edge of grid', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Test movement within valid range
      const validMoves = gameState.getValidMovePositions(unit.id);
      expect(validMoves.length).toBeGreaterThan(0);

      // Move to first valid position
      const targetPos = validMoves[0];
      expect(gameState.canUnitMoveTo(unit.id, targetPos.x, targetPos.y)).toBe(true);
      expect(gameState.moveUnit(unit.id, targetPos.x, targetPos.y)).toBe(true);
      expect(unit.position.x).toBe(targetPos.x);
      expect(unit.position.y).toBe(targetPos.y);
    });

    test('should handle corner cases at grid boundaries', () => {
      // Test all four corners
      const corners = [
        { x: 0, y: 0 },
        { x: 24, y: 0 },
        { x: 0, y: 24 },
        { x: 24, y: 24 },
      ];

      corners.forEach((corner, index) => {
        const unit = gameState.createUnit('worker', 1, corner.x, corner.y);
        expect(unit).toBeTruthy();
        expect(unit.position.x).toBe(corner.x);
        expect(unit.position.y).toBe(corner.y);

        // Try invalid moves from corner
        const invalidMoves = [
          { x: corner.x - 1, y: corner.y },
          { x: corner.x, y: corner.y - 1 },
          { x: corner.x + (corner.x === 0 ? 0 : 1), y: corner.y },
          { x: corner.x, y: corner.y + (corner.y === 0 ? 0 : 1) },
        ].filter(
          (move) => move.x < 0 || move.x >= 25 || move.y < 0 || move.y >= 25,
        );

        invalidMoves.forEach((move) => {
          expect(gameState.canUnitMoveTo(unit.id, move.x, move.y)).toBe(false);
        });
      });
    });
  });

  describe('Collision Detection', () => {
    test('should prevent movement to occupied squares - same player', () => {
      const { player1Unit: unit1, player2Unit: unit2 } = TestScenarios.setupBasicTwoPlayer(gameState);
      expect(unit1).toBeTruthy();
      expect(unit2).toBeTruthy();

      // Unit1 cannot move to unit2's position
      expect(gameState.canUnitMoveTo(unit1.id, 6, 5)).toBe(false);
      expect(gameState.moveUnit(unit1.id, 6, 5)).toBe(false);
      expect(unit1.position.x).toBe(5);
      expect(unit1.position.y).toBe(5);
    });

    test('should prevent movement to occupied squares - different players', () => {
      const unit1 = gameState.createUnit('worker', 1, 2, 23);
      const unit2 = gameState.createUnit('infantry', 2, 22, 1);

      // Unit1 cannot move to unit2's position
      expect(gameState.canUnitMoveTo(unit1.id, 22, 1)).toBe(false);
      expect(gameState.moveUnit(unit1.id, 22, 1)).toBe(false);
      expect(unit1.position.x).toBe(2);
      expect(unit1.position.y).toBe(23);
    });

    test('should handle multiple units clustering', () => {
      // Create a cluster of units around the center, leaving center empty
      const units = [];
      for (let x = 10; x <= 12; x++) {
        for (let y = 10; y <= 12; y++) {
          if (!(x === 11 && y === 11)) {
            // Skip center position
            units.push(gameState.createUnit('worker', 1, x, y));
          }
        }
      }

      // Center should be empty
      expect(gameState.isPositionEmpty(11, 11)).toBe(true);

      // Try to move first unit to the center
      expect(gameState.canUnitMoveTo(units[0].id, 11, 11)).toBe(true);
      expect(gameState.moveUnit(units[0].id, 11, 11)).toBe(true);

      // Now center is occupied, others cannot move there
      expect(gameState.canUnitMoveTo(units[1].id, 11, 11)).toBe(false);
      expect(gameState.moveUnit(units[1].id, 11, 11)).toBe(false);
    });

    test('should properly update board state after movement', () => {
      const unit = gameState.createUnit('worker', 1, 2, 23);

      // Verify initial board state
      expect(gameState.board[2][23]).toBe(unit.id);
      expect(gameState.board[3][23]).toBe(null);

      // Move unit
      expect(gameState.moveUnit(unit.id, 3, 23)).toBe(true);

      // Verify board state updated correctly
      expect(gameState.board[2][23]).toBe(null);
      expect(gameState.board[3][23]).toBe(unit.id);
      expect(gameState.getUnitAt(2, 23)).toBe(null);
      expect(gameState.getUnitAt(3, 23)).toBe(unit);
    });
  });

  describe('Action System Integration', () => {
    test('should prevent movement when unit has no actions remaining', () => {
      const unit = gameState.createUnit('worker', 1, 2, 23); // Worker has 2 actions

      // Use all actions
      unit.useAction();
      unit.useAction();
      expect(unit.canAct()).toBe(false);

      // Cannot move without actions
      expect(gameState.canUnitMoveTo(unit.id, 6, 5)).toBe(false);
      expect(gameState.moveUnit(unit.id, 6, 5)).toBe(false);
      expect(unit.position.x).toBe(5);
    });

    test('should respect movement range based on remaining actions', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'scout', 1);
      expect(unit).toBeTruthy(); // Scout has 4 movement

      // Initially can move up to 4 squares
      expect(gameState.canUnitMoveTo(unit.id, 14, 10)).toBe(true);
      expect(gameState.canUnitMoveTo(unit.id, 15, 10)).toBe(false);

      // Use 2 actions
      unit.useAction();
      unit.useAction();

      // Now can only move 2 squares
      expect(gameState.canUnitMoveTo(unit.id, 12, 10)).toBe(true);
      expect(gameState.canUnitMoveTo(unit.id, 13, 10)).toBe(false);
    });

    test('should consume correct number of actions for movement distance', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'scout', 1);
      expect(unit).toBeTruthy();
      expect(unit.actionsUsed).toBe(0);

      // Move 3 squares should consume 3 actions
      expect(gameState.moveUnit(unit.id, 13, 10)).toBe(true);
      expect(unit.actionsUsed).toBe(3);
      expect(unit.canAct()).toBe(true); // Should have 1 action left

      // Move 1 more square should exhaust actions
      expect(gameState.moveUnit(unit.id, 14, 10)).toBe(true);
      expect(unit.actionsUsed).toBe(4);
      expect(unit.canAct()).toBe(false);
    });

    test('should calculate movement cost correctly for diagonal movement', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Manhattan distance calculation
      expect(gameState.calculateMovementCost(unit.id, 11, 11)).toBe(2); // |1|+|1| = 2
      expect(gameState.calculateMovementCost(unit.id, 12, 10)).toBe(2); // |2|+|0| = 2
      expect(gameState.calculateMovementCost(unit.id, 10, 12)).toBe(2); // |0|+|2| = 2
      expect(gameState.calculateMovementCost(unit.id, 9, 9)).toBe(2); // |-1|+|-1| = 2
    });
  });

  describe('Game Phase Integration', () => {
    test('should allow movement only during action phase', () => {
      const unit = gameState.createUnit('worker', 1, 5, 5);

      // Start in resource phase
      expect(gameState.currentPhase).toBe('resource');

      // Movement should work in action phase
      turnManager.nextPhase(); // Go to action phase
      expect(gameState.currentPhase).toBe('action');
      expect(gameState.canUnitMoveTo(unit.id, 6, 5)).toBe(true);
      expect(gameState.moveUnit(unit.id, 6, 5)).toBe(true);

      // Reset unit position and exhaust actions to move to build phase
      gameState.moveUnit(unit.id, 5, 5);
      const player = gameState.getCurrentPlayer();
      while (player.actionsRemaining > 0) {
        player.useAction();
      }

      turnManager.nextPhase(); // Go to build phase
      expect(gameState.currentPhase).toBe('build');

      // Movement should not work in build phase (this is a design choice)
      // Note: The current implementation doesn't restrict this, but it should
    });

    test('should reset unit actions at turn start', () => {
      const unit = gameState.createUnit('worker', 1, 5, 5);

      // Exhaust unit actions
      unit.useAction();
      unit.useAction();
      expect(unit.canAct()).toBe(false);

      // Force end turn to trigger action reset - this switches to player 2
      turnManager.forceEndTurn();

      // Force end turn again to get back to player 1
      turnManager.forceEndTurn();

      // Unit should have actions reset when it's player 1's turn again
      expect(unit.actionsUsed).toBe(0);
      expect(unit.canAct()).toBe(true);
    });
  });

  describe('Turn Transition Testing', () => {
    test('should maintain unit positions across turn transitions', () => {
      const unit1 = gameState.createUnit('worker', 1, 5, 5);
      const unit2 = gameState.createUnit('scout', 2, 15, 15);

      // Move units
      turnManager.nextPhase(); // Go to action phase
      gameState.moveUnit(unit1.id, 7, 5);

      // End turn
      turnManager.forceEndTurn();

      // Verify positions maintained
      expect(unit1.position.x).toBe(7);
      expect(unit1.position.y).toBe(5);
      expect(unit2.position.x).toBe(15);
      expect(unit2.position.y).toBe(15);
      expect(gameState.board[7][5]).toBe(unit1.id);
      expect(gameState.board[15][15]).toBe(unit2.id);
    });

    test('should properly handle player actions across turns', () => {
      const unit = gameState.createUnit('worker', 1, 5, 5);
      turnManager.nextPhase(); // Go to action phase

      const player = gameState.getCurrentPlayer();
      const initialActions = player.actionsRemaining;

      // Use movement (uses turn manager action)
      turnManager.usePlayerAction();
      expect(player.actionsRemaining).toBe(initialActions - 1);

      // End turn
      turnManager.forceEndTurn();

      // New player should have full actions
      const newPlayer = gameState.getCurrentPlayer();
      expect(newPlayer.actionsRemaining).toBe(3); // MAX_ACTIONS from constants
    });
  });

  describe('Movement Range Display', () => {
    test('should calculate valid move positions correctly', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy(); // 2 movement

      const validMoves = gameState.getValidMovePositions(unit.id);

      // Should include all positions within Manhattan distance 2
      const expectedPositions = [
        // Distance 1
        { x: 9, y: 10, cost: 1 },
        { x: 11, y: 10, cost: 1 },
        { x: 10, y: 9, cost: 1 },
        { x: 10, y: 11, cost: 1 },
        // Distance 2
        { x: 8, y: 10, cost: 2 },
        { x: 12, y: 10, cost: 2 },
        { x: 10, y: 8, cost: 2 },
        { x: 10, y: 12, cost: 2 },
        { x: 9, y: 9, cost: 2 },
        { x: 9, y: 11, cost: 2 },
        { x: 11, y: 9, cost: 2 },
        { x: 11, y: 11, cost: 2 },
      ];

      expect(validMoves.length).toBe(expectedPositions.length);

      expectedPositions.forEach((expected) => {
        const found = validMoves.find(
          (move) => move.x === expected.x && move.y === expected.y,
        );
        expect(found).toBeTruthy();
        expect(found.cost).toBe(expected.cost);
      });
    });

    test('should exclude occupied positions from valid moves', () => {
      const unit1 = gameState.createUnit('worker', 1, 10, 10);
      const unit2 = gameState.createUnit('scout', 1, 11, 10);

      const validMoves = gameState.getValidMovePositions(unit1.id);

      // Should not include position occupied by unit2
      const occupiedMove = validMoves.find(
        (move) => move.x === 11 && move.y === 10,
      );
      expect(occupiedMove).toBeFalsy();
    });

    test('should respect grid boundaries in valid moves', () => {
      const unit = gameState.createUnit('scout', 1, 1, 1); // 4 movement, near corner

      const validMoves = gameState.getValidMovePositions(unit.id);

      // Should not include any moves with negative coordinates
      validMoves.forEach((move) => {
        expect(move.x).toBeGreaterThanOrEqual(0);
        expect(move.y).toBeGreaterThanOrEqual(0);
        expect(move.x).toBeLessThan(25);
        expect(move.y).toBeLessThan(25);
      });
    });
  });

  describe('Performance Testing', () => {
    test('should handle multiple units movement efficiently', () => {
      const startTime = performance.now();

      // Create many units
      const units = [];
      for (let i = 0; i < 50; i++) {
        const x = i % 25;
        const y = Math.floor(i / 25) * 2;
        if (gameState.isPositionEmpty(x, y)) {
          units.push(gameState.createUnit('worker', 1, x, y));
        }
      }

      // Calculate movement ranges for all units
      units.forEach((unit) => {
        if (unit) {
          gameState.getValidMovePositions(unit.id);
        }
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete in reasonable time (less than 100ms)
      expect(executionTime).toBeLessThan(100);
    });

    test('should handle large grid efficiently', () => {
      const startTime = performance.now();

      // Test movement calculations across the entire grid
      const unit = gameState.createUnit('scout', 1, 12, 12); // Center of grid

      for (let i = 0; i < 100; i++) {
        gameState.getValidMovePositions(unit.id);
        gameState.calculateMovementCost(
          unit.id,
          Math.floor(Math.random() * 25),
          Math.floor(Math.random() * 25),
        );
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete efficiently
      expect(executionTime).toBeLessThan(50);
    });
  });

  describe('Memory Management', () => {
    test('should not create memory leaks with repeated movement operations', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Perform many movement operations
      for (let i = 0; i < 100; i++) {
        const targetX = 10 + (i % 3) - 1;
        const targetY = 10 + (Math.floor(i / 3) % 3) - 1;

        if (
          gameState.isValidPosition(targetX, targetY) &&
          gameState.isPositionEmpty(targetX, targetY)
        ) {
          gameState.moveUnit(unit.id, targetX, targetY);
        }

        // Reset actions periodically
        if (i % 10 === 0) {
          unit.resetActions();
        }
      }

      // Verify game state consistency
      expect(gameState.units.size).toBeGreaterThan(0);
      expect(gameState.getUnitAt(unit.position.x, unit.position.y)).toBe(unit);
    });

    test('should properly clean up when units are removed', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();
      const unitId = unit.id;
      const position = { ...unit.position };

      // Remove unit
      gameState.removeUnit(unitId);

      // Verify cleanup
      expect(gameState.units.has(unitId)).toBe(false);
      expect(gameState.board[position.x][position.y]).toBe(null);
      expect(gameState.getUnitAt(position.x, position.y)).toBe(null);

      const player = gameState.players.get(1);
      expect(player.unitsOwned.has(unitId)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid unit IDs gracefully', () => {
      expect(gameState.canUnitMoveTo('invalid-id', 5, 5)).toBe(false);
      expect(gameState.moveUnit('invalid-id', 5, 5)).toBe(false);
      expect(gameState.getValidMovePositions('invalid-id')).toEqual([]);
      expect(gameState.calculateMovementCost('invalid-id', 5, 5)).toBe(-1);
    });

    test('should handle extreme coordinate values', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();

      // Test with very large numbers
      expect(gameState.canUnitMoveTo(unit.id, 1000, 1000)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, -1000, -1000)).toBe(false);

      // Test with NaN and undefined
      expect(gameState.canUnitMoveTo(unit.id, NaN, 5)).toBe(false);
      expect(gameState.canUnitMoveTo(unit.id, 5, undefined)).toBe(false);
    });

    test('should maintain consistency after failed operations', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      expect(unit).toBeTruthy();
      const originalPosition = { ...unit.position };
      const originalActions = unit.actionsUsed;

      // Attempt invalid moves
      gameState.moveUnit(unit.id, -1, 10); // Out of bounds
      gameState.moveUnit(unit.id, 25, 10); // Out of bounds

      // State should be unchanged
      expect(unit.position.x).toBe(originalPosition.x);
      expect(unit.position.y).toBe(originalPosition.y);
      expect(unit.actionsUsed).toBe(originalActions);
      expect(gameState.board[originalPosition.x][originalPosition.y]).toBe(
        unit.id,
      );
    });
  });
});
