/**
 * Design Patterns - Central export for all pattern implementations
 */

// Command Pattern
export { Command } from '../commands/Command.js';
export { MoveCommand } from '../commands/MoveCommand.js';
export { AttackCommand } from '../commands/AttackCommand.js';
export { BuildCommand } from '../commands/BuildCommand.js';
export { CommandManager } from '../commands/CommandManager.js';

// Factory Pattern
export { EntityFactory } from '../factories/EntityFactory.js';

// Observer Pattern
export { 
  EventEmitter, 
  Observable, 
  GameEventTypes, 
  EventData 
} from './Observer.js';

/**
 * Pattern Usage Examples and Documentation
 */
export const PatternExamples = {
  /**
   * Command Pattern Usage:
   * 
   * const commandManager = new CommandManager();
   * const moveCommand = new MoveCommand(gameState, unitId, targetPos, turnManager);
   * const result = commandManager.executeCommand(moveCommand);
   * 
   * if (result.success) {
   *   // Command executed successfully
   *   console.log('Unit moved:', result.description);
   * }
   * 
   * // Undo the last command
   * commandManager.undo();
   */
  
  /**
   * Factory Pattern Usage:
   * 
   * const unit = EntityFactory.createUnit('infantry', playerId, x, y);
   * const base = EntityFactory.createBase(playerId, x, y);
   * const resource = EntityFactory.createResourceNode(x, y, 100);
   * 
   * // Validate before creation
   * const validation = EntityFactory.validateCreation('unit', {
   *   unitType: 'scout',
   *   playerId: 1,
   *   x: 10,
   *   y: 5
   * });
   */
  
  /**
   * Observer Pattern Usage:
   * 
   * const emitter = new EventEmitter();
   * 
   * emitter.on(GameEventTypes.UNIT_MOVED, (data) => {
   *   console.log(`Unit ${data.unit.id} moved from (${data.from.x}, ${data.from.y}) to (${data.to.x}, ${data.to.y})`);
   * });
   * 
   * emitter.emit(GameEventTypes.UNIT_MOVED, EventData.unitMoved(unit, oldPos, newPos, cost));
   */
};

/**
 * Pattern Integration Helper
 */
export class PatternIntegrator {
  /**
   * Setup patterns for a game instance
   * @param {Object} game Game instance
   * @returns {Object} Pattern instances
   */
  static setupPatterns(game) {
    const commandManager = new CommandManager();
    
    // Setup command event listeners
    commandManager.on('commandExecuted', (data) => {
      if (game.uiStateManager) {
        game.uiStateManager.updateStatus(`Executed: ${data.command.getDescription()}`);
      }
    });

    commandManager.on('commandFailed', (data) => {
      if (game.uiStateManager) {
        game.uiStateManager.updateStatus(`Failed: ${data.error}`);
      }
    });

    return {
      commandManager,
      entityFactory: EntityFactory
    };
  }

  /**
   * Create a command-based action handler
   * @param {Object} game Game instance
   * @param {CommandManager} commandManager Command manager
   * @returns {Object} Action handlers
   */
  static createActionHandlers(game, commandManager) {
    return {
      moveUnit: (unitId, targetPos) => {
        const command = new MoveCommand(
          game.gameState, 
          unitId, 
          targetPos, 
          game.turnManager
        );
        return commandManager.executeCommand(command);
      },

      attackTarget: (attackerUnitId, targetPos) => {
        const command = new AttackCommand(
          game.gameState,
          attackerUnitId,
          targetPos,
          game.turnManager
        );
        return commandManager.executeCommand(command);
      },

      buildUnit: (unitType, position, playerId) => {
        const command = new BuildCommand(
          game.gameState,
          unitType,
          position,
          playerId,
          game.turnManager
        );
        return commandManager.executeCommand(command);
      },

      undo: () => {
        return commandManager.undo();
      },

      redo: () => {
        return commandManager.redo();
      }
    };
  }
}