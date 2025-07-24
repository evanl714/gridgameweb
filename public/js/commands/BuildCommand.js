/**
 * BuildCommand - Encapsulates unit creation actions
 * Implements Command pattern for building units
 */

import { Command } from './Command.js';

export class BuildCommand extends Command {
  constructor(gameState, unitType, position, playerId, turnManager = null) {
    super();
    this.gameState = gameState;
    this.unitType = unitType;
    this.position = { x: position.x, y: position.y };
    this.playerId = playerId;
    this.turnManager = turnManager;

    // Store state for undo
    this.createdUnitId = null;
    this.energyCost = 0;
    this.actionUsed = false;
  }

  canExecute() {
    if (!this.gameState || this.executed) {
      return false;
    }

    // Check if position is empty
    if (!this.gameState.isPositionEmpty(this.position.x, this.position.y)) {
      return false;
    }

    // Check if player has enough resources
    const player = this.gameState.players.get(this.playerId);
    if (!player) {
      return false;
    }

    // Get unit cost (simplified - in real game this would come from unit definitions)
    this.energyCost = this.getUnitCost(this.unitType);

    return player.energy >= this.energyCost;
  }

  execute() {
    if (!this.canExecute()) {
      return {
        success: false,
        error: 'Cannot execute build command',
        unitType: this.unitType,
        position: this.position,
        reason: this.getFailureReason()
      };
    }

    const player = this.gameState.players.get(this.playerId);

    // Create the unit
    const createResult = this.gameState.createUnit(
      this.unitType,
      this.playerId,
      this.position.x,
      this.position.y
    );

    if (createResult && createResult.success) {
      this.executed = true;
      this.createdUnitId = createResult.unit.id;

      // Deduct energy cost
      player.energy -= this.energyCost;

      // Use turn manager action if provided
      if (this.turnManager) {
        this.turnManager.usePlayerAction();
        this.actionUsed = true;
      }

      return {
        success: true,
        unit: createResult.unit,
        energyCost: this.energyCost,
        position: this.position,
        description: this.getDescription()
      };
    } else {
      return {
        success: false,
        error: 'Unit creation failed',
        unitType: this.unitType,
        position: this.position
      };
    }
  }

  undo() {
    if (!this.canUndo()) {
      return {
        success: false,
        error: 'Cannot undo build command'
      };
    }

    const unit = this.gameState.units.get(this.createdUnitId);
    if (!unit) {
      return {
        success: false,
        error: 'Created unit not found for undo'
      };
    }

    // Remove the unit
    const removeResult = this.gameState.removeUnit(this.createdUnitId);

    if (removeResult) {
      // Restore energy
      const player = this.gameState.players.get(this.playerId);
      if (player) {
        player.energy += this.energyCost;
      }

      // Restore action if it was used
      if (this.actionUsed && this.turnManager) {
        const currentPlayer = this.gameState.getCurrentPlayer();
        if (currentPlayer) {
          currentPlayer.actionsRemaining += 1;
        }
        this.actionUsed = false;
      }

      this.executed = false;
      this.createdUnitId = null;

      return {
        success: true,
        unitType: this.unitType,
        position: this.position,
        energyRestored: this.energyCost,
        description: `Undid: ${this.getDescription()}`
      };
    }

    return {
      success: false,
      error: 'Failed to undo unit creation'
    };
  }

  getDescription() {
    return `Build ${this.unitType} at (${this.position.x}, ${this.position.y})`;
  }

  /**
   * Get unit cost based on type
   * @param {string} unitType Unit type to build
   * @returns {number} Energy cost
   */
  getUnitCost(unitType) {
    const costs = {
      worker: 10,
      scout: 15,
      infantry: 25,
      heavy: 50
    };
    return costs[unitType] || 10;
  }

  /**
   * Get reason why command cannot be executed
   * @returns {string} Failure reason
   */
  getFailureReason() {
    if (!this.gameState.isPositionEmpty(this.position.x, this.position.y)) {
      return 'Position occupied';
    }

    const player = this.gameState.players.get(this.playerId);
    if (!player) {
      return 'Player not found';
    }

    if (player.energy < this.energyCost) {
      return `Insufficient energy (need ${this.energyCost}, have ${player.energy})`;
    }

    return 'Unknown reason';
  }

  /**
   * Get detailed build information
   * @returns {Object} Build details
   */
  getBuildInfo() {
    return {
      unitType: this.unitType,
      position: this.position,
      playerId: this.playerId,
      energyCost: this.energyCost,
      createdUnitId: this.createdUnitId,
      executed: this.executed
    };
  }
}
