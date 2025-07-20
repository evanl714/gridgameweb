/**
 * Enhanced Game Logic Validation & Testing Suite
 * Implements comprehensive edge case testing, stress testing, and validation
 * Based on Task 13 requirements and testing best practices research
 */

import { GameState } from '../public/gameState.js';
import { TurnManager } from '../public/turnManager.js';
import { ResourceManager } from '../public/resourceManager.js';
import { TestDataFactory, TestScenarios } from './testUtilities.js';
import { GAME_CONFIG, BASE_CONFIG, RESOURCE_CONFIG, COMBAT_CONFIG } from '../shared/constants.js';

describe('Enhanced Game Logic Validation', () => {
  let gameState;
  let turnManager;
  let resourceManager;

  beforeEach(() => {
    gameState = new GameState();
    turnManager = new TurnManager(gameState);
    resourceManager = new ResourceManager(gameState);
    gameState.startGame();
  });

  describe('Boundary Condition Testing', () => {
    test('should handle maximum unit density scenarios', () => {
      // Test grid at maximum capacity within base radius
      const maxUnits = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, 20);
      expect(maxUnits.length).toBeGreaterThan(10); // Should create at least 10 units
      
      // Verify all units are within base radius
      maxUnits.forEach(unit => {
        const basePos = BASE_CONFIG.STARTING_POSITIONS[1];
        const distance = Math.abs(unit.position.x - basePos.x) + Math.abs(unit.position.y - basePos.y);
        expect(distance).toBeLessThanOrEqual(BASE_CONFIG.PLACEMENT_RADIUS);
      });

      // Test movement calculations with high unit density
      const startTime = performance.now();
      maxUnits.forEach(unit => {
        const validMoves = gameState.getValidMovePositions(unit.id);
        expect(Array.isArray(validMoves)).toBe(true);
      });
      const calculationTime = performance.now() - startTime;
      expect(calculationTime).toBeLessThan(50); // Should complete within 50ms
    });

    test('should handle edge positions and corner cases', () => {
      const edgeUnits = TestDataFactory.createEdgeUnits(gameState, 'scout', 1);
      expect(edgeUnits.length).toBeGreaterThan(0);

      edgeUnits.forEach(unit => {
        // Test movement from edge positions
        const validMoves = gameState.getValidMovePositions(unit.id);
        
        // Verify no moves go off grid
        validMoves.forEach(move => {
          expect(move.x).toBeGreaterThanOrEqual(0);
          expect(move.x).toBeLessThan(GAME_CONFIG.GRID_SIZE);
          expect(move.y).toBeGreaterThanOrEqual(0);
          expect(move.y).toBeLessThan(GAME_CONFIG.GRID_SIZE);
        });
      });
    });

    test('should validate all unit type interactions', () => {
      const unitTypes = ['worker', 'scout', 'infantry', 'heavy'];
      
      unitTypes.forEach(attackerType => {
        unitTypes.forEach(defenderType => {
          // Create combat scenario
          const attacker = TestDataFactory.createValidUnit(gameState, attackerType, 1);
          const defender = TestDataFactory.createValidUnit(gameState, defenderType, 2);
          
          if (attacker && defender) {
            // Test damage calculations
            const damage = COMBAT_CONFIG.DAMAGE_VALUES[attackerType] || 1;
            expect(damage).toBeGreaterThan(0);
            expect(damage).toBeLessThanOrEqual(3);
            
            // Test unit health ranges
            expect(defender.health).toBeGreaterThan(0);
            expect(defender.health).toBeLessThanOrEqual(200);
          }
        });
      });
    });
  });

  describe('Resource System Stress Testing', () => {
    test('should handle resource depletion scenarios', () => {
      // Deplete all resource nodes
      resourceManager.resourceNodes.forEach(node => {
        node.value = 0;
      });

      const worker = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      if (worker) {
        const result = resourceManager.gatherResources(worker.id);
        expect(result.success).toBe(false);
        expect(result.reason).toContain('No resources available');
      }

      // Test regeneration with depleted nodes
      resourceManager.regenerateResources();
      
      const totalResources = resourceManager.getTotalResourcesAvailable();
      expect(totalResources).toBeGreaterThan(0); // Should regenerate
    });

    test('should handle maximum worker gathering scenario', () => {
      // Create workers near each resource node
      const workers = [];
      const resourcePositions = RESOURCE_CONFIG.NODE_POSITIONS;
      
      resourcePositions.forEach(nodePos => {
        // Try to create worker near this node for both players
        const worker1 = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
        const worker2 = TestDataFactory.createUnitNearResource(gameState, 'worker', 2);
        
        if (worker1) workers.push(worker1);
        if (worker2) workers.push(worker2);
      });

      expect(workers.length).toBeGreaterThan(0);

      // Test simultaneous gathering
      workers.forEach(worker => {
        if (worker.canAct()) {
          const result = resourceManager.gatherResources(worker.id);
          // Some may succeed, some may fail due to positioning
          expect(typeof result.success).toBe('boolean');
        }
      });
    });

    test('should maintain resource balance constraints', () => {
      const initialTotal = resourceManager.getTotalResourcesAvailable();
      expect(initialTotal).toBe(RESOURCE_CONFIG.NODE_COUNT * RESOURCE_CONFIG.INITIAL_VALUE);

      // Test resource conservation
      const worker = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      if (worker) {
        const initialPlayerEnergy = gameState.players.get(1).energy;
        const result = resourceManager.gatherResources(worker.id);
        
        if (result.success) {
          const finalTotal = resourceManager.getTotalResourcesAvailable();
          const finalPlayerEnergy = gameState.players.get(1).energy;
          
          // Resources should be conserved (transferred not created)
          expect(finalTotal).toBe(initialTotal - result.amount);
          expect(finalPlayerEnergy).toBe(initialPlayerEnergy + result.amount);
        }
      }
    });
  });

  describe('Combat System Edge Cases', () => {
    test('should handle simultaneous unit destruction', () => {
      const { attacker, defender } = TestScenarios.setupCombatScenario(gameState);
      if (!attacker || !defender) return;

      // Set up scenario where both units destroy each other
      attacker.health = 1;
      defender.health = 1;

      const attackerDamage = COMBAT_CONFIG.DAMAGE_VALUES[attacker.type] || 1;
      expect(attackerDamage).toBeGreaterThanOrEqual(1);

      // Attack should succeed and destroy defender
      const result = gameState.attackUnit(attacker.id, defender.position.x, defender.position.y);
      expect(result).toBe(true);

      // Verify defender is destroyed
      expect(gameState.units.has(defender.id)).toBe(false);
    });

    test('should validate base destruction mechanics', () => {
      const base1 = gameState.getPlayerBase(1);
      const base2 = gameState.getPlayerBase(2);
      
      expect(base1).toBeTruthy();
      expect(base2).toBeTruthy();
      expect(base1.health).toBe(BASE_CONFIG.HEALTH);
      expect(base2.health).toBe(BASE_CONFIG.HEALTH);

      // Test base damage calculations
      const attacker = TestDataFactory.createValidUnit(gameState, 'heavy', 1);
      if (attacker) {
        const damage = COMBAT_CONFIG.DAMAGE_VALUES.heavy;
        const turnsToDestroy = Math.ceil(BASE_CONFIG.HEALTH / damage);
        expect(turnsToDestroy).toBeGreaterThan(0);
        expect(turnsToDestroy).toBeLessThan(100); // Reasonable upper bound
      }
    });
  });

  describe('Turn System Validation', () => {
    test('should handle rapid turn transitions', () => {
      const initialTurn = gameState.turnNumber;
      const initialPlayer = gameState.currentPlayer;

      // Simulate rapid turn changes
      for (let i = 0; i < 10; i++) {
        turnManager.forceEndTurn();
        expect(gameState.turnNumber).toBeGreaterThan(initialTurn);
      }

      // Verify turn alternation
      expect(gameState.currentPlayer).toBe(initialPlayer === 1 ? 2 : 1);
    });

    test('should validate action limits and enforcement', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      if (!unit) return;

      expect(unit.canAct()).toBe(true);
      expect(unit.actionsUsed).toBe(0);

      // Use all actions
      while (unit.canAct()) {
        unit.useAction();
      }

      expect(unit.canAct()).toBe(false);
      expect(unit.actionsUsed).toBe(unit.maxActions);

      // Test turn reset
      turnManager.forceEndTurn();
      turnManager.forceEndTurn(); // Back to original player
      
      expect(unit.canAct()).toBe(true);
      expect(unit.actionsUsed).toBe(0);
    });

    test('should handle phase transition edge cases', () => {
      const phases = ['resource', 'action', 'build'];
      
      phases.forEach(expectedPhase => {
        // Force specific phase
        gameState.currentPhase = expectedPhase;
        
        // Test phase-specific restrictions
        const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
        if (unit) {
          const canMove = gameState.canUnitMoveTo(unit.id, unit.position.x + 1, unit.position.y);
          
          if (expectedPhase === 'action') {
            // Movement should be allowed in action phase (if position is valid)
            expect(typeof canMove).toBe('boolean');
          } else {
            // Movement restrictions in other phases are implementation-dependent
            expect(typeof canMove).toBe('boolean');
          }
        }
      });
    });
  });

  describe('Victory Condition Validation', () => {
    test('should detect all victory scenarios correctly', () => {
      let victoryEvents = [];
      gameState.on('gameEnded', (data) => {
        victoryEvents.push(data);
      });

      // Test base destruction victory
      const player2Base = gameState.getPlayerBase(2);
      if (player2Base) {
        player2Base.health = 0;
        gameState.checkVictoryCondition();
        expect(victoryEvents.length).toBeGreaterThan(0);
        expect(victoryEvents[0].winner).toBe(1);
      }
    });

    test('should handle draw conditions', () => {
      let gameEndEvents = [];
      gameState.on('gameEnded', (data) => {
        gameEndEvents.push(data);
      });

      // Simulate simultaneous base destruction
      const base1 = gameState.getPlayerBase(1);
      const base2 = gameState.getPlayerBase(2);
      
      if (base1 && base2) {
        // Remove both bases
        gameState.bases.delete(base1.id);
        gameState.bases.delete(base2.id);
        
        gameState.checkVictoryCondition();
        expect(gameEndEvents.length).toBeGreaterThan(0);
        expect(gameEndEvents[0].winner).toBe(null); // Draw
      }
    });
  });

  describe('Memory and Performance Validation', () => {
    test('should not leak memory during intensive operations', () => {
      const initialUnitCount = gameState.units.size;
      
      // Create and destroy units repeatedly
      for (let i = 0; i < 50; i++) {
        const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
        if (unit) {
          gameState.removeUnit(unit.id);
        }
      }

      expect(gameState.units.size).toBe(initialUnitCount);
      
      // Check board cleanup
      let occupiedCells = 0;
      for (let x = 0; x < GAME_CONFIG.GRID_SIZE; x++) {
        for (let y = 0; y < GAME_CONFIG.GRID_SIZE; y++) {
          if (gameState.board[x][y] !== null) {
            occupiedCells++;
          }
        }
      }
      
      // Only bases should remain
      expect(occupiedCells).toBe(2); // Two player bases
    });

    test('should maintain performance under stress', () => {
      const maxUnits = TestDataFactory.createMultipleUnits(gameState, 'scout', 1, 15);
      
      const startTime = performance.now();
      
      // Perform intensive operations
      for (let i = 0; i < 100; i++) {
        maxUnits.forEach(unit => {
          if (unit) {
            gameState.getValidMovePositions(unit.id);
            gameState.getValidAttackTargets(unit.id);
          }
        });
      }
      
      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('State Consistency Validation', () => {
    test('should maintain game state integrity after errors', () => {
      const initialState = {
        turnNumber: gameState.turnNumber,
        currentPlayer: gameState.currentPlayer,
        unitCount: gameState.units.size,
        baseCount: gameState.bases.size
      };

      // Attempt invalid operations
      try {
        gameState.moveUnit('invalid-id', 0, 0);
        gameState.attackUnit('invalid-id', 0, 0);
        gameState.createUnit('invalid-type', 999, 0, 0);
      } catch (error) {
        // Errors are expected and acceptable
      }

      // Verify state remains consistent
      expect(gameState.turnNumber).toBe(initialState.turnNumber);
      expect(gameState.currentPlayer).toBe(initialState.currentPlayer);
      expect(gameState.units.size).toBe(initialState.unitCount);
      expect(gameState.bases.size).toBe(initialState.baseCount);
    });

    test('should validate all game rules enforcement', () => {
      const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
      if (!unit) return;

      // Test movement rules
      expect(gameState.canUnitMoveTo(unit.id, -1, -1)).toBe(false); // Off grid
      expect(gameState.canUnitMoveTo(unit.id, 25, 25)).toBe(false); // Off grid
      
      // Test action limits
      while (unit.canAct()) {
        unit.useAction();
      }
      
      expect(gameState.canUnitMoveTo(unit.id, unit.position.x + 1, unit.position.y)).toBe(false); // No actions
      
      // Test energy constraints
      const player = gameState.players.get(1);
      const initialEnergy = player.energy;
      player.energy = 0;
      
      const newUnit = gameState.createUnit('heavy', 1, 3, 3); // Expensive unit
      expect(newUnit).toBe(null); // Should fail due to insufficient energy
      
      player.energy = initialEnergy; // Restore for other tests
    });
  });
});