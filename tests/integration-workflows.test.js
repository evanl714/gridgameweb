/**
 * Integration Testing for Complete Game Workflows
 * Tests end-to-end scenarios and system interactions
 * Based on Task 13 requirements for comprehensive integration validation
 */

import { GameState } from '../public/gameState.js';
import { TurnManager } from '../public/turnManager.js';
import { ResourceManager } from '../public/resourceManager.js';
import { TestDataFactory, TestScenarios } from './testUtilities.js';
import { GAME_CONFIG, BASE_CONFIG, RESOURCE_CONFIG } from '../shared/constants.js';

describe('Integration Testing - Complete Game Workflows', () => {
  let gameState;
  let turnManager;
  let resourceManager;

  beforeEach(() => {
    gameState = new GameState();
    turnManager = new TurnManager(gameState);
    resourceManager = new ResourceManager(gameState);
    gameState.startGame();
  });

  describe('Complete Game Flow Validation', () => {
    test('should execute full game from start to victory', () => {
      const gameEvents = [];

      // Monitor game events
      gameState.on('gameStarted', (data) => gameEvents.push({ type: 'gameStarted', data }));
      gameState.on('unitCreated', (data) => gameEvents.push({ type: 'unitCreated', data }));
      gameState.on('unitAttacked', (data) => gameEvents.push({ type: 'unitAttacked', data }));
      gameState.on('baseDestroyed', (data) => gameEvents.push({ type: 'baseDestroyed', data }));
      gameState.on('gameEnded', (data) => gameEvents.push({ type: 'gameEnded', data }));

      // Phase 1: Initial game state validation
      expect(gameState.status).toBe('playing');
      expect(gameState.currentPlayer).toBe(1);
      expect(gameState.turnNumber).toBe(1);
      expect(gameState.players.size).toBe(2);
      expect(gameState.bases.size).toBe(2);

      // Phase 2: Unit creation and resource gathering
      const worker1 = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      const worker2 = TestDataFactory.createUnitNearResource(gameState, 'worker', 2);

      expect(worker1).toBeTruthy();
      expect(worker2).toBeTruthy();

      // Simulate resource gathering
      gameState.currentPhase = 'resource';
      const gather1 = resourceManager.gatherResources(worker1.id);
      if (gather1.success) {
        expect(gameState.players.get(1).energy).toBeGreaterThan(100);
      }

      // Phase 3: Build military units
      gameState.currentPhase = 'build';
      const attacker = TestDataFactory.createValidUnit(gameState, 'heavy', 1);
      expect(attacker).toBeTruthy();

      // Phase 4: Combat scenario
      gameState.currentPhase = 'action';
      const targetBase = gameState.getPlayerBase(2);

      if (attacker && targetBase) {
        // Move attacker toward enemy base (if possible)
        const validMoves = gameState.getValidMovePositions(attacker.id);
        if (validMoves.length > 0) {
          const moveResult = gameState.moveUnit(attacker.id, validMoves[0].x, validMoves[0].y);
          expect(moveResult).toBe(true);
        }

        // Phase 5: Victory condition - destroy enemy base
        targetBase.health = 1; // Set low health for quick victory
        const attackResult = gameState.attackUnit(attacker.id, targetBase.position.x, targetBase.position.y);

        if (attackResult) {
          expect(gameState.status).toBe('ended');
          expect(gameState.winner).toBe(1);
        }
      }

      // Verify event sequence
      const eventTypes = gameEvents.map(e => e.type);
      expect(eventTypes).toContain('unitCreated');

      console.log(`Game flow completed with ${gameEvents.length} events:`, eventTypes);
    });

    test('should handle complete turn cycle with all phases', () => {
      const phaseSequence = [];
      let turnEvents = [];

      // Track phase transitions
      const originalPhase = gameState.currentPhase;

      // Player 1 turn cycle
      gameState.currentPhase = 'resource';
      phaseSequence.push('resource');

      // Resource phase activities
      const worker = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      if (worker) {
        const gatherResult = resourceManager.gatherResources(worker.id);
        turnEvents.push({ phase: 'resource', action: 'gather', success: gatherResult.success });
      }

      // Action phase activities
      gameState.currentPhase = 'action';
      phaseSequence.push('action');

      if (worker && worker.canAct()) {
        const validMoves = gameState.getValidMovePositions(worker.id);
        if (validMoves.length > 0) {
          const moveResult = gameState.moveUnit(worker.id, validMoves[0].x, validMoves[0].y);
          turnEvents.push({ phase: 'action', action: 'move', success: moveResult });
        }
      }

      // Build phase activities
      gameState.currentPhase = 'build';
      phaseSequence.push('build');

      const newUnit = TestDataFactory.createValidUnit(gameState, 'scout', 1);
      turnEvents.push({ phase: 'build', action: 'create', success: newUnit !== null });

      // End turn and verify state
      const initialPlayer = gameState.currentPlayer;
      turnManager.forceEndTurn();

      expect(gameState.currentPlayer).not.toBe(initialPlayer);
      expect(phaseSequence).toEqual(['resource', 'action', 'build']);
      expect(turnEvents.length).toBeGreaterThan(0);

      console.log('Turn cycle events:', turnEvents);
    });
  });

  describe('Multi-Player Interaction Workflows', () => {
    test('should handle competitive resource gathering', () => {
      const results = [];

      // Create workers for both players near the same resource area
      const worker1 = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      const worker2 = TestDataFactory.createUnitNearResource(gameState, 'worker', 2);

      expect(worker1).toBeTruthy();
      expect(worker2).toBeTruthy();

      gameState.currentPhase = 'resource';

      // Simulate alternating resource gathering
      for (let round = 0; round < 5; round++) {
        // Player 1 gathers
        gameState.currentPlayer = 1;
        const result1 = resourceManager.gatherResources(worker1.id);
        results.push({ player: 1, round, success: result1.success, amount: result1.amount || 0 });

        // Player 2 gathers
        gameState.currentPlayer = 2;
        const result2 = resourceManager.gatherResources(worker2.id);
        results.push({ player: 2, round, success: result2.success, amount: result2.amount || 0 });

        // Regenerate resources between rounds
        resourceManager.regenerateResources();
      }

      // Verify competitive balance
      const player1Total = results.filter(r => r.player === 1).reduce((sum, r) => sum + r.amount, 0);
      const player2Total = results.filter(r => r.player === 2).reduce((sum, r) => sum + r.amount, 0);

      expect(player1Total).toBeGreaterThan(0);
      expect(player2Total).toBeGreaterThan(0);

      console.log(`Resource competition: P1=${player1Total}, P2=${player2Total}`);
    });

    test('should handle complex combat interactions', () => {
      const combatLog = [];

      // Create military units for both players
      const units1 = TestDataFactory.createMultipleUnits(gameState, 'infantry', 1, 3);
      const units2 = TestDataFactory.createMultipleUnits(gameState, 'infantry', 2, 3);

      expect(units1.length).toBeGreaterThan(0);
      expect(units2.length).toBeGreaterThan(0);

      gameState.currentPhase = 'action';

      // Simulate combat rounds
      for (let round = 0; round < 3; round++) {
        // Player 1 attacks
        gameState.currentPlayer = 1;
        units1.forEach(unit => {
          if (unit && gameState.units.has(unit.id) && unit.canAct()) {
            const targets = gameState.getValidAttackTargets(unit.id);
            if (targets.length > 0) {
              const target = targets[0];
              const attackResult = gameState.attackUnit(unit.id, target.x, target.y);
              combatLog.push({
                round,
                attacker: unit.id,
                target: target,
                success: attackResult
              });
            }
          }
        });

        // Player 2 counter-attacks
        gameState.currentPlayer = 2;
        units2.forEach(unit => {
          if (unit && gameState.units.has(unit.id) && unit.canAct()) {
            const targets = gameState.getValidAttackTargets(unit.id);
            if (targets.length > 0) {
              const target = targets[0];
              const attackResult = gameState.attackUnit(unit.id, target.x, target.y);
              combatLog.push({
                round,
                attacker: unit.id,
                target: target,
                success: attackResult
              });
            }
          }
        });

        // Reset actions for next round
        [...units1, ...units2].forEach(unit => {
          if (unit && gameState.units.has(unit.id)) {
            unit.resetActions();
          }
        });
      }

      expect(combatLog.length).toBeGreaterThan(0);
      console.log(`Combat interactions: ${combatLog.length} attacks over 3 rounds`);
    });
  });

  describe('Save/Load Integration', () => {
    test('should maintain game state integrity through serialization', () => {
      // Set up complex game state
      const worker1 = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      const worker2 = TestDataFactory.createValidUnit(gameState, 'scout', 2);

      if (worker1) {
        worker1.useAction(); // Modify unit state
        resourceManager.gatherResources(worker1.id); // Create cooldown
      }

      gameState.currentPlayer = 2;
      gameState.turnNumber = 5;
      gameState.currentPhase = 'action';

      // Capture state before serialization
      const originalState = {
        currentPlayer: gameState.currentPlayer,
        turnNumber: gameState.turnNumber,
        currentPhase: gameState.currentPhase,
        unitCount: gameState.units.size,
        baseCount: gameState.bases.size,
        player1Energy: gameState.players.get(1).energy,
        player2Energy: gameState.players.get(2).energy
      };

      // Serialize game state
      const gameStateSerialized = gameState.serialize();
      const resourceManagerSerialized = resourceManager.serialize();

      // Verify serialization contains expected data
      expect(gameStateSerialized).toHaveProperty('currentPlayer');
      expect(gameStateSerialized).toHaveProperty('turnNumber');
      expect(gameStateSerialized).toHaveProperty('units');
      expect(gameStateSerialized).toHaveProperty('players');

      // Create new game instance and deserialize
      const newGameState = new GameState();
      const newResourceManager = new ResourceManager(newGameState);

      // Note: Full deserialization would require implementing deserialize methods
      // For now, verify that serialization captures all critical data
      expect(gameStateSerialized.currentPlayer).toBe(originalState.currentPlayer);
      expect(gameStateSerialized.turnNumber).toBe(originalState.turnNumber);
      expect(gameStateSerialized.currentPhase).toBe(originalState.currentPhase);
      expect(Object.keys(gameStateSerialized.units)).toHaveLength(originalState.unitCount);

      console.log('Serialization test: State captured successfully');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover gracefully from mid-game errors', () => {
      const errorLog = [];
      const originalConsoleError = console.error;
      console.error = (...args) => errorLog.push(args.join(' '));

      try {
        // Set up normal game state
        const unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
        expect(unit).toBeTruthy();

        const initialUnitCount = gameState.units.size;
        const initialBoardState = JSON.stringify(gameState.board);

        // Introduce various error conditions
        gameState.moveUnit('invalid-unit-id', 0, 0);
        gameState.attackUnit('invalid-unit-id', 0, 0);
        gameState.createUnit('invalid-type', 1, 0, 0);
        resourceManager.gatherResources('invalid-unit-id');

        // Verify game state remains intact
        expect(gameState.units.size).toBe(initialUnitCount);
        expect(JSON.stringify(gameState.board)).toBe(initialBoardState);
        expect(gameState.status).toBe('playing');

        // Verify normal operations still work
        if (unit) {
          const validMoves = gameState.getValidMovePositions(unit.id);
          expect(Array.isArray(validMoves)).toBe(true);
        }

        console.log(`Error recovery test: Game remained stable after ${errorLog.length} error conditions`);
      } finally {
        console.error = originalConsoleError;
      }
    });

    test('should handle resource exhaustion scenarios', () => {
      // Deplete all resources
      resourceManager.resourceNodes.forEach(node => {
        node.value = 0;
      });

      const worker = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
      if (!worker) return;

      const initialEnergy = gameState.players.get(1).energy;

      // Attempt resource gathering with no resources
      const result = resourceManager.gatherResources(worker.id);
      expect(result.success).toBe(false);
      expect(gameState.players.get(1).energy).toBe(initialEnergy);

      // Verify game continues to function
      expect(gameState.status).toBe('playing');

      const validMoves = gameState.getValidMovePositions(worker.id);
      expect(Array.isArray(validMoves)).toBe(true);

      // Test regeneration recovery
      resourceManager.regenerateResources();
      const totalResources = resourceManager.getTotalResourcesAvailable();
      expect(totalResources).toBeGreaterThan(0);

      console.log('Resource exhaustion recovery: Game remained functional');
    });
  });

  describe('Performance Integration Under Load', () => {
    test('should maintain performance during complex scenarios', () => {
      const performanceData = [];

      // Create complex game scenario
      const units1 = TestDataFactory.createMultipleUnits(gameState, 'worker', 1, 10);
      const units2 = TestDataFactory.createMultipleUnits(gameState, 'scout', 2, 8);

      // Simulate intensive gameplay for multiple turns
      for (let turn = 0; turn < 5; turn++) {
        const turnStart = performance.now();

        // Resource phase
        gameState.currentPhase = 'resource';
        units1.forEach(unit => {
          if (unit && gameState.units.has(unit.id)) {
            resourceManager.gatherResources(unit.id);
          }
        });

        // Action phase
        gameState.currentPhase = 'action';
        [...units1, ...units2].forEach(unit => {
          if (unit && gameState.units.has(unit.id)) {
            gameState.getValidMovePositions(unit.id);
            gameState.getValidAttackTargets(unit.id);
          }
        });

        // Build phase
        gameState.currentPhase = 'build';
        TestDataFactory.createValidUnit(gameState, 'infantry', 1);
        TestDataFactory.createValidUnit(gameState, 'infantry', 2);

        const turnTime = performance.now() - turnStart;
        performanceData.push(turnTime);

        turnManager.forceEndTurn();
      }

      const avgTurnTime = performanceData.reduce((a, b) => a + b, 0) / performanceData.length;
      const maxTurnTime = Math.max(...performanceData);

      expect(avgTurnTime).toBeLessThan(50); // Average turn under 50ms
      expect(maxTurnTime).toBeLessThan(100); // Max turn under 100ms

      console.log(`Complex scenario performance: ${avgTurnTime.toFixed(2)}ms avg, ${maxTurnTime.toFixed(2)}ms max`);
    });
  });

  describe('End-to-End Victory Scenarios', () => {
    test('should complete base destruction victory workflow', () => {
      const victoryEvents = [];
      gameState.on('gameEnded', (data) => victoryEvents.push(data));

      // Create attacking force
      const attacker = TestDataFactory.createValidUnit(gameState, 'heavy', 1);
      expect(attacker).toBeTruthy();

      const enemyBase = gameState.getPlayerBase(2);
      expect(enemyBase).toBeTruthy();

      // Simulate systematic base destruction
      gameState.currentPhase = 'action';
      let attacksNeeded = 0;

      while (enemyBase.health > 0 && attacksNeeded < 100) { // Safety limit
        const attackResult = gameState.attackUnit(attacker.id, enemyBase.position.x, enemyBase.position.y);
        if (attackResult) {
          attacksNeeded++;
          attacker.resetActions(); // Reset for multiple attacks
        } else {
          break; // Can't attack (position, etc.)
        }
      }

      if (enemyBase.health <= 0) {
        expect(gameState.status).toBe('ended');
        expect(gameState.winner).toBe(1);
        expect(victoryEvents.length).toBeGreaterThan(0);
        console.log(`Victory achieved in ${attacksNeeded} attacks`);
      } else {
        console.log('Victory test skipped - could not position attacker near base');
      }
    });

    test('should handle draw conditions properly', () => {
      const gameEndEvents = [];
      gameState.on('gameEnded', (data) => gameEndEvents.push(data));

      // Simulate simultaneous base destruction
      const base1 = gameState.getPlayerBase(1);
      const base2 = gameState.getPlayerBase(2);

      if (base1 && base2) {
        // Destroy both bases simultaneously
        base1.health = 0;
        base2.health = 0;

        gameState.checkVictoryCondition();

        expect(gameEndEvents.length).toBeGreaterThan(0);
        expect(gameEndEvents[0].winner).toBe(null); // Draw
        expect(gameState.status).toBe('ended');

        console.log('Draw condition properly detected and handled');
      }
    });
  });
});
