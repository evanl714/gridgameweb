/**
 * EntityFactory - Factory Pattern for creating game entities
 * Centralizes entity creation logic and provides consistent interfaces
 */

import { UNIT_TYPES, BASE_CONFIG } from '../../shared/constants.js';

export class EntityFactory {
  /**
   * Create a unit with specified parameters
   * @param {string} type Unit type (worker, scout, infantry, heavy)
   * @param {number} playerId Player ID who owns the unit
   * @param {number} x X coordinate
   * @param {number} y Y coordinate
   * @param {Object} overrides Optional property overrides
   * @returns {Object} Created unit object
   */
  static createUnit(type, playerId, x, y, overrides = {}) {
    const unitTemplate = this.getUnitTemplate(type);

    if (!unitTemplate) {
      throw new Error(`Unknown unit type: ${type}`);
    }

    const unit = {
      id: this.generateId('unit'),
      type: type,
      playerId: playerId,
      position: { x, y },
      health: unitTemplate.maxHealth,
      maxHealth: unitTemplate.maxHealth,
      attack: unitTemplate.attack,
      defense: unitTemplate.defense,
      movementRange: unitTemplate.movementRange,
      maxActions: unitTemplate.maxActions,
      actionsUsed: 0,
      isAlive: true,
      createdAt: Date.now(),

      // Methods
      canAct: function() {
        return this.actionsUsed < this.maxActions && this.isAlive;
      },

      getStats: function() {
        return {
          name: this.type.charAt(0).toUpperCase() + this.type.slice(1),
          health: this.health,
          maxHealth: this.maxHealth,
          attack: this.attack,
          defense: this.defense,
          movementRange: this.movementRange,
          actions: `${this.actionsUsed}/${this.maxActions}`
        };
      },

      takeDamage: function(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health === 0) {
          this.isAlive = false;
        }
        return this.health;
      },

      heal: function(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health;
      },

      resetActions: function() {
        this.actionsUsed = 0;
      },

      useAction: function() {
        if (this.canAct()) {
          this.actionsUsed++;
          return true;
        }
        return false;
      },

      ...overrides
    };

    return unit;
  }

  /**
   * Create a base with specified parameters
   * @param {number} playerId Player ID who owns the base
   * @param {number} x X coordinate
   * @param {number} y Y coordinate
   * @param {Object} overrides Optional property overrides
   * @returns {Object} Created base object
   */
  static createBase(playerId, x, y, overrides = {}) {
    const baseTemplate = this.getBaseTemplate();

    const base = {
      id: this.generateId('base'),
      type: 'base',
      playerId: playerId,
      position: { x, y },
      health: baseTemplate.maxHealth,
      maxHealth: baseTemplate.maxHealth,
      defense: baseTemplate.defense,
      isAlive: true,
      isDestroyed: false,
      createdAt: Date.now(),

      // Methods
      takeDamage: function(amount) {
        this.health = Math.max(0, this.health - Math.max(1, amount - this.defense));
        if (this.health === 0) {
          this.isAlive = false;
          this.isDestroyed = true;
        }
        return this.health;
      },

      heal: function(amount) {
        if (!this.isDestroyed) {
          this.health = Math.min(this.maxHealth, this.health + amount);
        }
        return this.health;
      },

      getStats: function() {
        return {
          name: 'Base',
          health: this.health,
          maxHealth: this.maxHealth,
          defense: this.defense,
          status: this.isDestroyed ? 'Destroyed' : 'Active'
        };
      },

      ...overrides
    };

    return base;
  }

  /**
   * Create a resource node
   * @param {number} x X coordinate
   * @param {number} y Y coordinate
   * @param {number} initialValue Initial resource value
   * @param {Object} overrides Optional property overrides
   * @returns {Object} Created resource node
   */
  static createResourceNode(x, y, initialValue = 100, overrides = {}) {
    const resourceNode = {
      id: this.generateId('resource'),
      type: 'resource',
      position: { x, y },
      value: initialValue,
      maxValue: initialValue,
      regenerationRate: 1, // Resources per turn
      lastGathered: 0,
      createdAt: Date.now(),

      // Methods
      gather: function(amount = 10) {
        const gathered = Math.min(amount, this.value);
        this.value -= gathered;
        this.lastGathered = Date.now();
        return gathered;
      },

      regenerate: function() {
        if (this.value < this.maxValue) {
          this.value = Math.min(this.maxValue, this.value + this.regenerationRate);
        }
        return this.value;
      },

      getEfficiency: function() {
        return this.value / this.maxValue;
      },

      isEmpty: function() {
        return this.value <= 0;
      },

      ...overrides
    };

    return resourceNode;
  }

  /**
   * Create a player object
   * @param {number} id Player ID
   * @param {string} name Player name
   * @param {Object} overrides Optional property overrides
   * @returns {Object} Created player object
   */
  static createPlayer(id, name = `Player ${id}`, overrides = {}) {
    const player = {
      id: id,
      name: name,
      energy: 100,
      maxEnergy: 100,
      actionsRemaining: 3,
      maxActionsPerTurn: 3,
      unitsOwned: new Set(),
      basesOwned: new Set(),
      resourcesGathered: 0,
      score: 0,
      isActive: true,
      createdAt: Date.now(),

      // Methods
      addUnit: function(unitId) {
        this.unitsOwned.add(unitId);
      },

      removeUnit: function(unitId) {
        this.unitsOwned.delete(unitId);
      },

      addBase: function(baseId) {
        this.basesOwned.add(baseId);
      },

      removeBase: function(baseId) {
        this.basesOwned.delete(baseId);
      },

      gainEnergy: function(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        return this.energy;
      },

      spendEnergy: function(amount) {
        if (this.energy >= amount) {
          this.energy -= amount;
          return true;
        }
        return false;
      },

      resetActions: function() {
        this.actionsRemaining = this.maxActionsPerTurn;
      },

      useAction: function() {
        if (this.actionsRemaining > 0) {
          this.actionsRemaining--;
          return true;
        }
        return false;
      },

      gatherResources: function(amount) {
        this.resourcesGathered += amount;
        this.score += amount;
      },

      getStats: function() {
        return {
          name: this.name,
          energy: this.energy,
          actions: this.actionsRemaining,
          units: this.unitsOwned.size,
          bases: this.basesOwned.size,
          resources: this.resourcesGathered,
          score: this.score
        };
      },

      ...overrides
    };

    return player;
  }

  /**
   * Get unit template by type
   * @param {string} type Unit type
   * @returns {Object} Unit template
   */
  static getUnitTemplate(type) {
    const templates = {
      worker: {
        maxHealth: 50,
        attack: 5,
        defense: 1,
        movementRange: 2,
        maxActions: 2,
        cost: 10,
        description: 'Basic worker unit for resource gathering'
      },
      scout: {
        maxHealth: 30,
        attack: 10,
        defense: 0,
        movementRange: 4,
        maxActions: 3,
        cost: 15,
        description: 'Fast reconnaissance unit'
      },
      infantry: {
        maxHealth: 100,
        attack: 20,
        defense: 2,
        movementRange: 2,
        maxActions: 2,
        cost: 25,
        description: 'Standard combat unit'
      },
      heavy: {
        maxHealth: 200,
        attack: 40,
        defense: 5,
        movementRange: 1,
        maxActions: 1,
        cost: 50,
        description: 'Heavy assault unit'
      }
    };

    return templates[type];
  }

  /**
   * Get base template
   * @returns {Object} Base template
   */
  static getBaseTemplate() {
    return {
      maxHealth: 300,
      defense: 10,
      cost: 100,
      description: 'Player base structure'
    };
  }

  /**
   * Get all available unit types
   * @returns {Array} Array of unit type names
   */
  static getAvailableUnitTypes() {
    return Object.keys(this.getUnitTemplate('worker') ? {
      worker: true,
      scout: true,
      infantry: true,
      heavy: true
    } : {});
  }

  /**
   * Generate unique ID for entities
   * @param {string} prefix ID prefix
   * @returns {string} Unique ID
   */
  static generateId(prefix = 'entity') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Validate entity creation parameters
   * @param {string} type Entity type
   * @param {Object} params Creation parameters
   * @returns {Object} Validation result
   */
  static validateCreation(type, params) {
    const errors = [];

    if (!type) {
      errors.push('Entity type is required');
    }

    if (params.x == null || params.y == null) {
      errors.push('Position coordinates (x, y) are required');
    }

    if (typeof params.x !== 'number' || typeof params.y !== 'number') {
      errors.push('Position coordinates must be numbers');
    }

    if (params.x < 0 || params.y < 0) {
      errors.push('Position coordinates must be non-negative');
    }

    if (type === 'unit' && !this.getUnitTemplate(params.unitType)) {
      errors.push(`Unknown unit type: ${params.unitType}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Create entity based on type with validation
   * @param {string} type Entity type (unit, base, resource, player)
   * @param {Object} params Creation parameters
   * @returns {Object} Creation result with entity or error
   */
  static createEntity(type, params) {
    const validation = this.validateCreation(type, params);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    try {
      let entity;

      switch (type) {
      case 'unit':
        entity = this.createUnit(params.unitType, params.playerId, params.x, params.y, params.overrides);
        break;
      case 'base':
        entity = this.createBase(params.playerId, params.x, params.y, params.overrides);
        break;
      case 'resource':
        entity = this.createResourceNode(params.x, params.y, params.initialValue, params.overrides);
        break;
      case 'player':
        entity = this.createPlayer(params.id, params.name, params.overrides);
        break;
      default:
        throw new Error(`Unknown entity type: ${type}`);
      }

      return {
        success: true,
        entity: entity
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
