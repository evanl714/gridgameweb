/**
 * AttackCommand - Encapsulates unit attack actions
 * Implements Command pattern for combat actions
 */

import { Command } from './Command.js';

export class AttackCommand extends Command {
  constructor(gameState, attackerUnitId, targetPosition, turnManager = null) {
    super();
    this.gameState = gameState;
    this.attackerUnitId = attackerUnitId;
    this.targetPosition = { x: targetPosition.x, y: targetPosition.y };
    this.turnManager = turnManager;

    // Store state for potential undo
    this.targetData = null;
    this.attackerOriginalActions = 0;
    this.actionUsed = false;
    this.targetDestroyed = false;
  }

  canExecute() {
    if (!this.gameState || this.executed) {
      return false;
    }

    const attacker = this.gameState.units.get(this.attackerUnitId);
    if (!attacker) {
      return false;
    }

    // Check if attacker belongs to current player
    if (attacker.playerId !== this.gameState.currentPlayer) {
      return false;
    }

    // Check if attack is valid
    return this.gameState.canUnitAttack(
      this.attackerUnitId,
      this.targetPosition.x,
      this.targetPosition.y
    );
  }

  execute() {
    if (!this.canExecute()) {
      return {
        success: false,
        error: 'Cannot execute attack command',
        attacker: this.attackerUnitId,
        target: this.targetPosition
      };
    }

    const attacker = this.gameState.units.get(this.attackerUnitId);
    const targetEntity = this.gameState.getEntityAt(this.targetPosition.x, this.targetPosition.y);

    if (!targetEntity) {
      return {
        success: false,
        error: 'No target found at position',
        target: this.targetPosition
      };
    }

    // Store original state for potential undo
    this.attackerOriginalActions = attacker.actionsUsed;
    this.targetData = {
      id: targetEntity.entity.id,
      type: targetEntity.type,
      originalHealth: targetEntity.entity.health,
      playerId: targetEntity.entity.playerId,
      position: { ...targetEntity.entity.position }
    };

    // Execute the attack
    const attackResult = this.gameState.attackUnit(
      this.attackerUnitId,
      this.targetPosition.x,
      this.targetPosition.y
    );

    if (attackResult) {
      this.executed = true;

      // Check if target was destroyed
      const targetStillExists = this.gameState.getEntityAt(this.targetPosition.x, this.targetPosition.y);
      this.targetDestroyed = !targetStillExists;

      // Use turn manager action if provided
      if (this.turnManager) {
        this.turnManager.usePlayerAction();
        this.actionUsed = true;
      }

      return {
        success: true,
        attacker: attacker,
        target: this.targetData,
        targetDestroyed: this.targetDestroyed,
        damage: this.calculateDamage(attacker, targetEntity.entity),
        description: this.getDescription()
      };
    } else {
      return {
        success: false,
        error: 'Attack failed',
        attacker: this.attackerUnitId,
        target: this.targetPosition
      };
    }
  }

  undo() {
    if (!this.canUndo()) {
      return {
        success: false,
        error: 'Cannot undo attack command'
      };
    }

    // Note: Attack commands are generally not undoable in most strategy games
    // This implementation is for demonstration purposes
    return {
      success: false,
      error: 'Attack commands cannot be undone - combat is irreversible'
    };
  }

  canUndo() {
    // Most strategy games don't allow undoing attacks
    return false;
  }

  getDescription() {
    const attacker = this.gameState.units.get(this.attackerUnitId);
    const attackerType = attacker ? attacker.type : 'unknown';
    const targetType = this.targetData ? this.targetData.type : 'target';
    return `${attackerType} attacks ${targetType} at (${this.targetPosition.x}, ${this.targetPosition.y})`;
  }

  /**
   * Calculate damage dealt (simplified version)
   * @param {Object} attacker Attacking unit
   * @param {Object} target Target entity
   * @returns {number} Damage amount
   */
  calculateDamage(attacker, target) {
    // This is a simplified damage calculation
    // In a real game, this would consider unit stats, modifiers, etc.
    return attacker.attack || 10;
  }

  /**
   * Get detailed attack information
   * @returns {Object} Attack details
   */
  getAttackInfo() {
    return {
      attackerUnitId: this.attackerUnitId,
      targetPosition: this.targetPosition,
      targetData: this.targetData,
      targetDestroyed: this.targetDestroyed,
      executed: this.executed
    };
  }
}
