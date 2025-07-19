/**
 * Unit tests for Base System
 */

import { GameState, Base } from '../public/gameState.js';
import { BASE_CONFIG } from '../shared/constants.js';

describe('Base', () => {
  let base;

  beforeEach(() => {
    base = new Base(1, 5, 5);
  });

  test('should initialize with correct default values', () => {
    expect(base.playerId).toBe(1);
    expect(base.position.x).toBe(5);
    expect(base.position.y).toBe(5);
    expect(base.health).toBe(BASE_CONFIG.HEALTH);
    expect(base.maxHealth).toBe(BASE_CONFIG.HEALTH);
    expect(base.isDestroyed).toBe(false);
    expect(base.id).toBeDefined();
  });

  test('should take damage correctly', () => {
    const wasDestroyed = base.takeDamage(50);
    expect(base.health).toBe(BASE_CONFIG.HEALTH - 50);
    expect(wasDestroyed).toBe(false);
    expect(base.isDestroyed).toBe(false);
  });

  test('should be destroyed when health reaches zero', () => {
    const wasDestroyed = base.takeDamage(BASE_CONFIG.HEALTH);
    expect(base.health).toBe(0);
    expect(wasDestroyed).toBe(true);
    expect(base.isDestroyed).toBe(true);
  });

  test('should not take damage below zero', () => {
    const wasDestroyed = base.takeDamage(BASE_CONFIG.HEALTH + 100);
    expect(base.health).toBe(0);
    expect(wasDestroyed).toBe(true);
  });

  test('should heal correctly', () => {
    base.takeDamage(100);
    base.heal(50);
    expect(base.health).toBe(BASE_CONFIG.HEALTH - 50);
    expect(base.isDestroyed).toBe(false);
  });

  test('should not heal above max health', () => {
    base.heal(50);
    expect(base.health).toBe(BASE_CONFIG.HEALTH);
  });

  test('should serialize and deserialize correctly', () => {
    base.takeDamage(50);
    const serialized = base.serialize();

    expect(serialized.id).toBe(base.id);
    expect(serialized.playerId).toBe(1);
    expect(serialized.position.x).toBe(5);
    expect(serialized.position.y).toBe(5);
    expect(serialized.health).toBe(BASE_CONFIG.HEALTH - 50);
    expect(serialized.isDestroyed).toBe(false);

    const deserialized = Base.deserialize(serialized);
    expect(deserialized.id).toBe(base.id);
    expect(deserialized.playerId).toBe(1);
    expect(deserialized.health).toBe(BASE_CONFIG.HEALTH - 50);
    expect(deserialized.isDestroyed).toBe(false);
  });

  test('should get valid placement positions', () => {
    const gameState = new GameState();
    const positions = base.getValidPlacementPositions(gameState);

    // Should have multiple valid positions around the base
    expect(positions.length).toBeGreaterThan(0);

    // All positions should be sorted by distance
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].distance).toBeGreaterThanOrEqual(
        positions[i - 1].distance,
      );
    }

    // All positions should be within placement radius
    positions.forEach((pos) => {
      const distance = Math.abs(pos.x - 5) + Math.abs(pos.y - 5);
      expect(distance).toBeLessThanOrEqual(BASE_CONFIG.PLACEMENT_RADIUS);
    });
  });
});

describe('GameState Base Management', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  test('should initialize with bases for all players', () => {
    expect(gameState.bases.size).toBe(2); // Two players

    const basesArray = Array.from(gameState.bases.values());
    const player1Base = basesArray.find((base) => base.playerId === 1);
    const player2Base = basesArray.find((base) => base.playerId === 2);

    expect(player1Base).toBeDefined();
    expect(player2Base).toBeDefined();

    expect(player1Base.position.x).toBe(BASE_CONFIG.STARTING_POSITIONS[1].x);
    expect(player1Base.position.y).toBe(BASE_CONFIG.STARTING_POSITIONS[1].y);
    expect(player2Base.position.x).toBe(BASE_CONFIG.STARTING_POSITIONS[2].x);
    expect(player2Base.position.y).toBe(BASE_CONFIG.STARTING_POSITIONS[2].y);
  });

  test('should get player base correctly', () => {
    const player1Base = gameState.getPlayerBase(1);
    const player2Base = gameState.getPlayerBase(2);
    const nonExistentBase = gameState.getPlayerBase(999);

    expect(player1Base).toBeDefined();
    expect(player1Base.playerId).toBe(1);
    expect(player2Base).toBeDefined();
    expect(player2Base.playerId).toBe(2);
    expect(nonExistentBase).toBeNull();
  });

  test('should check base radius correctly', () => {
    // Test position within radius of player 1 base (5,5)
    expect(gameState.isWithinBaseRadius(1, 6, 6)).toBe(true); // Distance 2
    expect(gameState.isWithinBaseRadius(1, 7, 6)).toBe(true); // Distance 3, within radius
    expect(gameState.isWithinBaseRadius(1, 8, 8)).toBe(false); // Distance 6, outside radius
    expect(gameState.isWithinBaseRadius(1, 10, 10)).toBe(false); // Distance 10, outside radius

    // Test position within radius of player 2 base (19,19)
    expect(gameState.isWithinBaseRadius(2, 18, 18)).toBe(true); // Distance 2
    expect(gameState.isWithinBaseRadius(2, 17, 18)).toBe(true); // Distance 3, within radius
    expect(gameState.isWithinBaseRadius(2, 16, 16)).toBe(false); // Distance 6, outside radius
    expect(gameState.isWithinBaseRadius(2, 10, 10)).toBe(false); // Distance 18, outside radius
  });

  test('should find best placement near base', () => {
    const placement = gameState.findBestPlacementNearBase(1);

    expect(placement).toBeDefined();
    expect(placement.x).toBeDefined();
    expect(placement.y).toBeDefined();
    expect(placement.distance).toBeDefined();

    // Should be within base radius
    expect(gameState.isWithinBaseRadius(1, placement.x, placement.y)).toBe(
      true,
    );

    // Should be empty position
    expect(gameState.isPositionEmpty(placement.x, placement.y)).toBe(true);
  });

  test('should validate unit creation near base', () => {
    const player1Base = gameState.getPlayerBase(1);

    // Should succeed within base radius
    const nearX = player1Base.position.x + 1;
    const nearY = player1Base.position.y + 1;
    const unit1 = gameState.createUnit('worker', 1, nearX, nearY);
    expect(unit1).toBeDefined();

    // Should fail outside base radius
    const farX = player1Base.position.x + 10;
    const farY = player1Base.position.y + 10;
    const unit2 = gameState.createUnit('worker', 1, farX, farY);
    expect(unit2).toBeNull();
  });

  test('should handle entity identification at positions', () => {
    const player1Base = gameState.getPlayerBase(1);

    // Check base entity
    const baseEntity = gameState.getEntityAt(
      player1Base.position.x,
      player1Base.position.y,
    );
    expect(baseEntity).toBeDefined();
    expect(baseEntity.type).toBe('base');
    expect(baseEntity.entity.id).toBe(player1Base.id);

    // Create unit and check unit entity
    const nearX = player1Base.position.x + 1;
    const nearY = player1Base.position.y + 1;
    const unit = gameState.createUnit('worker', 1, nearX, nearY);

    const unitEntity = gameState.getEntityAt(nearX, nearY);
    expect(unitEntity).toBeDefined();
    expect(unitEntity.type).toBe('unit');
    expect(unitEntity.entity.id).toBe(unit.id);

    // Check empty position
    const emptyEntity = gameState.getEntityAt(12, 12);
    expect(emptyEntity).toBeNull();
  });

  test('should prevent unit creation on base positions', () => {
    const player1Base = gameState.getPlayerBase(1);

    // Try to create unit on base position
    const unit = gameState.createUnit(
      'worker',
      1,
      player1Base.position.x,
      player1Base.position.y,
    );
    expect(unit).toBeNull();
  });

  test('should handle destroyed bases', () => {
    const player1Base = gameState.getPlayerBase(1);
    player1Base.takeDamage(BASE_CONFIG.HEALTH); // Destroy base

    const activeBase = gameState.getPlayerBase(1);
    expect(activeBase).toBeNull(); // Should not return destroyed base
  });
});

describe('Base Integration with Unit Creation', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  test('should enforce base proximity for all unit types', () => {
    const unitTypes = ['worker', 'scout', 'infantry', 'heavy'];
    const player1Base = gameState.getPlayerBase(1);

    unitTypes.forEach((unitType) => {
      // Valid position near base
      const validX = player1Base.position.x + 1;
      const validY = player1Base.position.y + 1;
      const validUnit = gameState.createUnit(unitType, 1, validX, validY);
      expect(validUnit).toBeDefined();

      // Invalid position far from base
      const invalidX = player1Base.position.x + 15;
      const invalidY = player1Base.position.y + 15;
      const invalidUnit = gameState.createUnit(unitType, 1, invalidX, invalidY);
      expect(invalidUnit).toBeNull();
    });
  });

  test('should work correctly with both players', () => {
    const player1Base = gameState.getPlayerBase(1);
    const player2Base = gameState.getPlayerBase(2);

    // Player 1 can build near their base
    const unit1 = gameState.createUnit(
      'worker',
      1,
      player1Base.position.x + 1,
      player1Base.position.y + 1,
    );
    expect(unit1).toBeDefined();

    // Player 2 can build near their base
    const unit2 = gameState.createUnit(
      'worker',
      2,
      player2Base.position.x + 1,
      player2Base.position.y + 1,
    );
    expect(unit2).toBeDefined();

    // Player 1 cannot build near player 2's base
    const invalidUnit = gameState.createUnit(
      'worker',
      1,
      player2Base.position.x + 1,
      player2Base.position.y + 1,
    );
    expect(invalidUnit).toBeNull();
  });
});
