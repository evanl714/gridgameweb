/**
 * Test Utilities for Grid Game Web
 * Provides helper functions for creating consistent test scenarios
 */

import { BASE_CONFIG, RESOURCE_CONFIG } from '../shared/constants.js';

/**
 * Test Data Factory for creating valid game scenarios
 */
export class TestDataFactory {
  /**
   * Get valid positions within base radius for a player
   * @param {number} playerId - Player ID (1 or 2)
   * @param {number} radius - Radius around base (default: 3)
   * @returns {Array} Array of {x, y} positions within base radius
   */
  static getValidPositionsForPlayer(playerId, radius = BASE_CONFIG.PLACEMENT_RADIUS) {
    const basePos = BASE_CONFIG.STARTING_POSITIONS[playerId];
    if (!basePos) return [];

    const positions = [];
    for (let x = Math.max(0, basePos.x - radius); x <= Math.min(24, basePos.x + radius); x++) {
      for (let y = Math.max(0, basePos.y - radius); y <= Math.min(24, basePos.y + radius); y++) {
        const distance = Math.abs(x - basePos.x) + Math.abs(y - basePos.y);
        if (distance <= radius) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }

  /**
   * Create a unit at a valid position within base radius
   * @param {GameState} gameState - Game state instance
   * @param {string} unitType - Type of unit to create
   * @param {number} playerId - Player ID (1 or 2)
   * @param {Object} preferences - Optional position preferences
   * @returns {Object|null} Created unit or null if failed
   */
  static createValidUnit(gameState, unitType, playerId, preferences = {}) {
    const validPositions = this.getValidPositionsForPlayer(playerId);

    // If specific position requested, check if it's valid
    if (preferences.x !== undefined && preferences.y !== undefined) {
      const isValid = validPositions.some(pos => pos.x === preferences.x && pos.y === preferences.y);
      if (isValid && gameState.isPositionEmpty(preferences.x, preferences.y)) {
        return gameState.createUnit(unitType, playerId, preferences.x, preferences.y);
      }
    }

    // Find first available position
    for (const pos of validPositions) {
      if (gameState.isPositionEmpty(pos.x, pos.y)) {
        return gameState.createUnit(unitType, playerId, pos.x, pos.y);
      }
    }

    return null; // No valid positions available
  }

  /**
   * Create a unit near a resource node for a specific player
   * @param {GameState} gameState - Game state instance
   * @param {string} unitType - Type of unit to create
   * @param {number} playerId - Player ID (1 or 2)
   * @returns {Object|null} Created unit or null if failed
   */
  static createUnitNearResource(gameState, unitType, playerId) {
    const basePos = BASE_CONFIG.STARTING_POSITIONS[playerId];
    if (!basePos) return null;

    // Find closest resource node to player's base
    let closestNode = null;
    let minDistance = Infinity;

    for (const nodePos of RESOURCE_CONFIG.NODE_POSITIONS) {
      const distance = Math.abs(nodePos.x - basePos.x) + Math.abs(nodePos.y - basePos.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = nodePos;
      }
    }

    if (!closestNode) return null;

    // Find valid positions adjacent to the resource node
    const adjacentPositions = [
      { x: closestNode.x - 1, y: closestNode.y },
      { x: closestNode.x + 1, y: closestNode.y },
      { x: closestNode.x, y: closestNode.y - 1 },
      { x: closestNode.x, y: closestNode.y + 1 },
      { x: closestNode.x - 1, y: closestNode.y - 1 },
      { x: closestNode.x + 1, y: closestNode.y - 1 },
      { x: closestNode.x - 1, y: closestNode.y + 1 },
      { x: closestNode.x + 1, y: closestNode.y + 1 }
    ];

    const validPositions = this.getValidPositionsForPlayer(playerId);

    // Find adjacent position that's also within base radius
    for (const adjPos of adjacentPositions) {
      const isWithinBase = validPositions.some(pos => pos.x === adjPos.x && pos.y === adjPos.y);
      if (isWithinBase &&
          adjPos.x >= 0 && adjPos.x < 25 &&
          adjPos.y >= 0 && adjPos.y < 25 &&
          gameState.isPositionEmpty(adjPos.x, adjPos.y)) {
        return gameState.createUnit(unitType, playerId, adjPos.x, adjPos.y);
      }
    }

    // Fallback: create unit at any valid position for the player
    return this.createValidUnit(gameState, unitType, playerId);
  }

  /**
   * Create units for testing at corner/edge positions
   * @param {GameState} gameState - Game state instance
   * @param {string} unitType - Type of unit to create
   * @param {number} playerId - Player ID (1 or 2)
   * @returns {Array} Array of created units at edge positions
   */
  static createEdgeUnits(gameState, unitType, playerId) {
    const validPositions = this.getValidPositionsForPlayer(playerId);
    const edgeUnits = [];

    // Filter for positions near grid edges (within 2 squares)
    const edgePositions = validPositions.filter(pos =>
      pos.x <= 2 || pos.x >= 22 || pos.y <= 2 || pos.y >= 22
    );

    for (const pos of edgePositions) {
      if (gameState.isPositionEmpty(pos.x, pos.y)) {
        const unit = gameState.createUnit(unitType, playerId, pos.x, pos.y);
        if (unit) {
          edgeUnits.push(unit);
          if (edgeUnits.length >= 4) break; // Limit to 4 edge units
        }
      }
    }

    return edgeUnits;
  }

  /**
   * Create multiple units for stress testing
   * @param {GameState} gameState - Game state instance
   * @param {string} unitType - Type of unit to create
   * @param {number} playerId - Player ID (1 or 2)
   * @param {number} maxCount - Maximum number of units to create
   * @returns {Array} Array of created units
   */
  static createMultipleUnits(gameState, unitType, playerId, maxCount = 10) {
    const validPositions = this.getValidPositionsForPlayer(playerId);
    const units = [];

    for (const pos of validPositions) {
      if (units.length >= maxCount) break;

      if (gameState.isPositionEmpty(pos.x, pos.y)) {
        const unit = gameState.createUnit(unitType, playerId, pos.x, pos.y);
        if (unit) {
          units.push(unit);
        }
      }
    }

    return units;
  }

  /**
   * Get known valid test positions for specific scenarios
   */
  static getTestPositions() {
    return {
      // Player 1 positions (base at 1,23)
      player1: {
        base: { x: 1, y: 23 },
        nearBase: [
          { x: 2, y: 23 }, { x: 1, y: 22 }, { x: 2, y: 22 }, { x: 3, y: 23 },
          { x: 1, y: 21 }, { x: 4, y: 23 }, { x: 0, y: 23 }, { x: 3, y: 22 }
        ],
        farFromResource: { x: 0, y: 23 }, // Within base radius but far from resources
        nearResource: { x: 4, y: 21 }     // Closest to resource node at (4,20)
      },
      // Player 2 positions (base at 23,1)
      player2: {
        base: { x: 23, y: 1 },
        nearBase: [
          { x: 22, y: 1 }, { x: 23, y: 2 }, { x: 22, y: 2 }, { x: 21, y: 1 },
          { x: 23, y: 3 }, { x: 20, y: 1 }, { x: 24, y: 1 }, { x: 21, y: 2 }
        ],
        farFromResource: { x: 24, y: 1 }, // Within base radius but far from resources
        nearResource: { x: 21, y: 4 }     // Closest to resource node at (20,4)
      }
    };
  }
}

/**
 * Test scenario generators for common test patterns
 */
export class TestScenarios {
  /**
   * Setup a basic two-player scenario with one unit each
   */
  static setupBasicTwoPlayer(gameState) {
    const player1Unit = TestDataFactory.createValidUnit(gameState, 'worker', 1);
    const player2Unit = TestDataFactory.createValidUnit(gameState, 'worker', 2);
    return { player1Unit, player2Unit };
  }

  /**
   * Setup a resource gathering scenario
   */
  static setupResourceGathering(gameState) {
    const worker1 = TestDataFactory.createUnitNearResource(gameState, 'worker', 1);
    const worker2 = TestDataFactory.createUnitNearResource(gameState, 'worker', 2);
    return { worker1, worker2 };
  }

  /**
   * Setup a combat scenario with adjacent enemy units
   */
  static setupCombatScenario(gameState) {
    const attacker = TestDataFactory.createValidUnit(gameState, 'infantry', 1);
    if (!attacker) return null;

    // Try to place defender adjacent to attacker
    const adjacentPositions = [
      { x: attacker.position.x - 1, y: attacker.position.y },
      { x: attacker.position.x + 1, y: attacker.position.y },
      { x: attacker.position.x, y: attacker.position.y - 1 },
      { x: attacker.position.x, y: attacker.position.y + 1 }
    ];

    const validPlayer2Positions = TestDataFactory.getValidPositionsForPlayer(2);

    for (const adjPos of adjacentPositions) {
      const isValidForPlayer2 = validPlayer2Positions.some(pos =>
        pos.x === adjPos.x && pos.y === adjPos.y
      );

      if (isValidForPlayer2 &&
          adjPos.x >= 0 && adjPos.x < 25 &&
          adjPos.y >= 0 && adjPos.y < 25 &&
          gameState.isPositionEmpty(adjPos.x, adjPos.y)) {
        const defender = gameState.createUnit('worker', 2, adjPos.x, adjPos.y);
        if (defender) {
          return { attacker, defender };
        }
      }
    }

    // Fallback: create defender at any valid position
    const defender = TestDataFactory.createValidUnit(gameState, 'worker', 2);
    return { attacker, defender };
  }
}
