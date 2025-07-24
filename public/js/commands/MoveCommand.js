/**
 * MoveCommand - Encapsulates unit movement actions
 * Implements Command pattern for undoable unit movements
 */

import { Command } from './Command.js';

export class MoveCommand extends Command {
  constructor(gameState, unitId, targetPosition, turnManager = null) {
    super();
    this.gameState = gameState;
    this.unitId = unitId;
    this.targetPosition = { x: targetPosition.x, y: targetPosition.y };
    this.turnManager = turnManager;
    
    // Store original position for undo
    this.originalPosition = null;
    this.movementCost = 0;
    this.actionUsed = false;
  }

  canExecute() {
    if (!this.gameState || this.executed) {
      return false;
    }

    const unit = this.gameState.units.get(this.unitId);
    if (!unit) {
      return false;
    }

    // Check if unit belongs to current player
    if (unit.playerId !== this.gameState.currentPlayer) {
      return false;
    }

    // Check if movement is valid
    return this.gameState.canUnitMoveTo(this.unitId, this.targetPosition.x, this.targetPosition.y);
  }

  execute() {
    if (!this.canExecute()) {
      return {
        success: false,
        error: 'Cannot execute move command',
        unit: this.unitId,
        target: this.targetPosition
      };
    }

    const unit = this.gameState.units.get(this.unitId);
    
    // Store original state for undo
    this.originalPosition = { x: unit.position.x, y: unit.position.y };
    this.movementCost = this.gameState.calculateMovementCost(
      this.unitId, 
      this.targetPosition.x, 
      this.targetPosition.y
    );

    // Execute the movement
    const moveResult = this.gameState.moveUnit(
      this.unitId, 
      this.targetPosition.x, 
      this.targetPosition.y
    );

    if (moveResult) {
      this.executed = true;
      
      // Use turn manager action if provided
      if (this.turnManager) {
        this.turnManager.usePlayerAction();
        this.actionUsed = true;
      }

      return {
        success: true,
        unit: unit,
        from: this.originalPosition,
        to: this.targetPosition,
        cost: this.movementCost,
        description: this.getDescription()
      };
    } else {
      return {
        success: false,
        error: 'Movement failed',
        unit: this.unitId,
        target: this.targetPosition
      };
    }
  }

  undo() {
    if (!this.canUndo()) {
      return {
        success: false,
        error: 'Cannot undo move command'
      };
    }

    const unit = this.gameState.units.get(this.unitId);
    if (!unit) {
      return {
        success: false,
        error: 'Unit not found for undo'
      };
    }

    // Restore original position
    const undoResult = this.gameState.moveUnit(
      this.unitId,
      this.originalPosition.x,
      this.originalPosition.y
    );

    if (undoResult) {
      // Restore action if it was used
      if (this.actionUsed && this.turnManager) {
        const player = this.gameState.getCurrentPlayer();
        if (player) {
          player.actionsRemaining += 1;
        }
        this.actionUsed = false;
      }

      this.executed = false;

      return {
        success: true,
        unit: unit,
        restoredTo: this.originalPosition,
        description: `Undid: ${this.getDescription()}`
      };
    }

    return {
      success: false,
      error: 'Failed to undo movement'
    };
  }

  getDescription() {
    const unit = this.gameState.units.get(this.unitId);
    const unitType = unit ? unit.type : 'unknown';
    return `Move ${unitType} to (${this.targetPosition.x}, ${this.targetPosition.y})`;
  }

  /**
   * Get detailed movement information
   * @returns {Object} Movement details
   */
  getMovementInfo() {
    return {
      unitId: this.unitId,
      from: this.originalPosition,
      to: this.targetPosition,
      cost: this.movementCost,
      executed: this.executed
    };
  }
}