/**
 * Unit tests for Combat System
 * Tests attack validation, damage calculation, and combat rules
 */

import { GameState, Unit } from '../public/gameState.js';
import { COMBAT_CONFIG } from '../shared/constants.js';

describe('Combat System', () => {
  let gameState;
  let player1;
  let player2;

  beforeEach(() => {
    gameState = new GameState();
    player1 = gameState.players.get(1);
    player2 = gameState.players.get(2);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create units for testing
  const createTestUnit = (type, playerId, x, y) => {
    // Create unit near appropriate base to satisfy radius constraints
    const basePositions = {
      1: { x: 2, y: 23 },   // Near player 1 base (1,23)
      2: { x: 22, y: 1 }    // Near player 2 base (23,1)
    };

    const basePos = basePositions[playerId];
    const unit = gameState.createUnit(type, playerId, basePos.x, basePos.y);

    if (unit && (x !== basePos.x || y !== basePos.y)) {
      // Move unit to desired test position
      gameState.board[basePos.x][basePos.y] = null;
      unit.moveTo(x, y);
      gameState.board[x][y] = unit.id;
    }

    return unit;
  };

  describe('Combat Validation', () => {
    test('should allow attack on adjacent enemy unit', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      const target = createTestUnit('infantry', 2, 11, 10);

      const canAttack = gameState.canUnitAttack(attacker.id, 11, 10);
      expect(canAttack).toBe(true);
    });

    test('should not allow attack on friendly unit', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      const friendly = createTestUnit('infantry', 1, 11, 10);

      const canAttack = gameState.canUnitAttack(attacker.id, 11, 10);
      expect(canAttack).toBe(false);
    });

    test('should not allow attack out of range', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      const target = createTestUnit('infantry', 2, 12, 10);

      const canAttack = gameState.canUnitAttack(attacker.id, 12, 10);
      expect(canAttack).toBe(false);
    });

    test('should not allow attack when unit has no actions remaining', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);

      // Use all actions
      for (let i = 0; i < attacker.maxActions; i++) {
        attacker.useAction();
      }

      const target = createTestUnit('infantry', 2, 11, 10);

      const canAttack = gameState.canUnitAttack(attacker.id, 11, 10);
      expect(canAttack).toBe(false);
    });

    test('should not allow attack on empty cell', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);

      const canAttack = gameState.canUnitAttack(attacker.id, 11, 10);
      expect(canAttack).toBe(false);
    });

    test('should not allow attack with invalid unit ID', () => {
      const canAttack = gameState.canUnitAttack('invalid-id', 11, 10);
      expect(canAttack).toBe(false);
    });
  });

  describe('Damage Calculation', () => {
    test('should deal correct damage based on unit type', () => {
      const damageTests = [
        { type: 'scout', expectedDamage: 1 },
        { type: 'infantry', expectedDamage: 2 },
        { type: 'heavy', expectedDamage: 3 },
        { type: 'worker', expectedDamage: 1 }
      ];

      damageTests.forEach(({ type, expectedDamage }) => {
        const attacker = createTestUnit(type, 1, 10, 10);
        const target = createTestUnit('infantry', 2, 11, 10);
        const initialHealth = target.health;

        const result = gameState.attackUnit(attacker.id, 11, 10);
        expect(result).toBe(true);

        const actualDamage = initialHealth - target.health;
        expect(actualDamage).toBe(expectedDamage);

        // Clean up
        gameState.removeUnit(attacker.id);
        gameState.removeUnit(target.id);
      });
    });

    test('should destroy unit when health reaches zero', () => {
      const attacker = createTestUnit('heavy', 1, 10, 10);
      const target = createTestUnit('scout', 2, 11, 10);

      // Reduce target health to 3 (will be destroyed by heavy's 3 damage)
      target.health = 3;

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);

      // Unit should be removed from game
      expect(gameState.units.has(target.id)).toBe(false);
      expect(gameState.getUnitAt(11, 10)).toBe(null);
    });

    test('should not destroy unit with remaining health', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      const target = createTestUnit('infantry', 2, 11, 10);

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);

      // Unit should still exist with reduced health
      expect(gameState.units.has(target.id)).toBe(true);
      expect(target.health).toBe(99); // 100 - 1 damage
    });
  });

  describe('Combat Actions and Events', () => {
    test('should consume attacker action when attacking', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      const target = createTestUnit('infantry', 2, 11, 10);

      const initialActions = attacker.actionsUsed;

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);
      expect(attacker.actionsUsed).toBe(initialActions + 1);
    });

    test('should emit unitAttacked event with correct data', () => {
      const attacker = createTestUnit('infantry', 1, 10, 10);
      const target = createTestUnit('scout', 2, 11, 10);

      const mockCallback = jest.fn();
      gameState.on('unitAttacked', mockCallback);

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);

      expect(mockCallback).toHaveBeenCalledWith({
        attackerId: attacker.id,
        targetId: target.id,
        targetType: 'unit',
        damage: 2,
        targetHealth: 28, // 30 - 2 damage
        destroyed: false
      });
    });

    test('should emit events when unit is destroyed', () => {
      const attacker = createTestUnit('heavy', 1, 10, 10);
      const target = createTestUnit('scout', 2, 11, 10);
      target.health = 1; // Will be destroyed by 3 damage

      const attackCallback = jest.fn();
      const removeCallback = jest.fn();
      gameState.on('unitAttacked', attackCallback);
      gameState.on('unitRemoved', removeCallback);

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);

      expect(attackCallback).toHaveBeenCalledWith(expect.objectContaining({
        destroyed: true
      }));

      expect(removeCallback).toHaveBeenCalledWith({
        unitId: target.id,
        playerId: 2
      });
    });
  });

  describe('Get Valid Attack Targets', () => {
    test('should return valid adjacent enemy targets', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);

      // Create targets around the attacker (directly adjacent)
      const target1 = createTestUnit('infantry', 2, 9, 10);   // Left
      const target2 = createTestUnit('heavy', 2, 11, 10);     // Right
      const friendly = createTestUnit('worker', 1, 10, 11);  // Bottom (friendly)

      const targets = gameState.getValidAttackTargets(attacker.id);

      expect(targets).toHaveLength(2);
      expect(targets.some(t => t.x === 9 && t.y === 10)).toBe(true);
      expect(targets.some(t => t.x === 11 && t.y === 10)).toBe(true);
      expect(targets.every(t => t.damage === 1)).toBe(true); // Scout damage
    });

    test('should return empty array when no valid targets', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);

      const targets = gameState.getValidAttackTargets(attacker.id);
      expect(targets).toEqual([]);
    });

    test('should return empty array when unit has no actions', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);

      // Use all actions
      for (let i = 0; i < attacker.maxActions; i++) {
        attacker.useAction();
      }

      const target = createTestUnit('infantry', 2, 11, 10);

      const targets = gameState.getValidAttackTargets(attacker.id);
      expect(targets).toEqual([]);
    });
  });

  describe('Base Combat', () => {
    test('should allow attacking enemy base', () => {
      // Create unit close to enemy base position
      const attacker = createTestUnit('heavy', 1, 22, 2);

      const canAttack = gameState.canUnitAttack(attacker.id, 23, 1);
      expect(canAttack).toBe(true);
    });

    test('should damage enemy base', () => {
      const attacker = createTestUnit('heavy', 1, 22, 2);
      // Find player 2's base
      const base = gameState.getPlayerBase(2);
      const initialHealth = base.health;

      const result = gameState.attackUnit(attacker.id, 23, 1);
      expect(result).toBe(true);
      expect(base.health).toBe(initialHealth - 3); // Heavy does 3 damage
    });

    test('should emit baseDestroyed event when base is destroyed', () => {
      const attacker = createTestUnit('heavy', 1, 22, 2);
      // Find player 2's base
      const base = gameState.getPlayerBase(2);
      base.health = 1; // Will be destroyed

      const baseDestroyedCallback = jest.fn();
      const victoryCheckCallback = jest.fn();
      gameState.on('baseDestroyed', baseDestroyedCallback);
      gameState.on('victoryCheck', victoryCheckCallback);

      const result = gameState.attackUnit(attacker.id, 23, 1);
      expect(result).toBe(true);

      expect(baseDestroyedCallback).toHaveBeenCalledWith({
        baseId: base.id,
        playerId: 2
      });

      expect(victoryCheckCallback).toHaveBeenCalled();
    });
  });

  describe('Combat Configuration', () => {
    test('should respect COMBAT_CONFIG damage values', () => {
      expect(COMBAT_CONFIG.DAMAGE_VALUES.scout).toBe(1);
      expect(COMBAT_CONFIG.DAMAGE_VALUES.infantry).toBe(2);
      expect(COMBAT_CONFIG.DAMAGE_VALUES.heavy).toBe(3);
      expect(COMBAT_CONFIG.DAMAGE_VALUES.worker).toBe(1);
      expect(COMBAT_CONFIG.ATTACK_RANGE).toBe(1);
    });

    test('should use default damage for unknown unit types', () => {
      const attacker = createTestUnit('scout', 1, 10, 10);
      attacker.type = 'unknown_type'; // Manually set invalid type

      const target = createTestUnit('infantry', 2, 11, 10);
      const initialHealth = target.health;

      const result = gameState.attackUnit(attacker.id, 11, 10);
      expect(result).toBe(true);

      const actualDamage = initialHealth - target.health;
      expect(actualDamage).toBe(1); // Default damage
    });
  });
});
