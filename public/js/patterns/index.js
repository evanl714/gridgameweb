/**
 * Design Patterns - Central export for all pattern implementations with lazy loading
 */

import { lazyLoader } from './LazyLoader.js';

// Register core patterns for lazy loading
lazyLoader.register('CommandManager', async () => {
  const module = await import('../commands/CommandManager.js');
  return module.CommandManager;
}, {
  priority: 10,
  critical: true,
  preload: true
});

lazyLoader.register('EntityFactory', async () => {
  const module = await import('../factories/EntityFactory.js');
  return module.EntityFactory;
}, {
  priority: 10,
  critical: true,
  preload: true
});

// Register command types for lazy loading
lazyLoader.register('MoveCommand', async () => {
  const module = await import('../commands/MoveCommand.js');
  return module.MoveCommand;
}, {
  priority: 8,
  dependencies: ['CommandManager']
});

lazyLoader.register('AttackCommand', async () => {
  const module = await import('../commands/AttackCommand.js');
  return module.AttackCommand;
}, {
  priority: 8,
  dependencies: ['CommandManager']
});

lazyLoader.register('BuildCommand', async () => {
  const module = await import('../commands/BuildCommand.js');
  return module.BuildCommand;
}, {
  priority: 6,
  dependencies: ['CommandManager', 'EntityFactory']
});

// Direct exports for immediate access (critical components)
export { Command } from '../commands/Command.js';
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
 * Pattern Integration Helper with Lazy Loading
 */
export class PatternIntegrator {
  /**
   * Setup patterns for a game instance using lazy loading
   * @param {Object} game Game instance
   * @returns {Promise<Object>} Pattern instances
   */
  static async setupPatterns(game) {
    // Load core patterns using lazy loader
    const CommandManager = await lazyLoader.load('CommandManager');
    const EntityFactory = await lazyLoader.load('EntityFactory');
    
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
   * Create a command-based action handler with lazy loading
   * @param {Object} game Game instance
   * @param {CommandManager} commandManager Command manager
   * @returns {Object} Action handlers with lazy loading
   */
  static async createActionHandlers(game, commandManager) {
    return {
      moveUnit: async (unitId, targetPos) => {
        const MoveCommand = await lazyLoader.load('MoveCommand');
        const command = new MoveCommand(
          game.gameState,
          unitId,
          targetPos,
          game.turnManager
        );
        return commandManager.executeCommand(command);
      },

      attackTarget: async (attackerUnitId, targetPos) => {
        const AttackCommand = await lazyLoader.load('AttackCommand');
        const command = new AttackCommand(
          game.gameState,
          attackerUnitId,
          targetPos,
          game.turnManager
        );
        return commandManager.executeCommand(command);
      },

      buildUnit: async (unitType, position, playerId) => {
        const BuildCommand = await lazyLoader.load('BuildCommand');
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

  /**
   * Load commands for specific game contexts
   * @param {string} context Game context (combat, building, etc.)
   * @returns {Promise<Object>} Context-specific commands
   */
  static async loadCommandsForContext(context) {
    const contextCommands = {
      'combat': ['AttackCommand', 'MoveCommand'],
      'building': ['BuildCommand'],
      'movement': ['MoveCommand'],
      'all': ['MoveCommand', 'AttackCommand', 'BuildCommand']
    };

    const commandNames = contextCommands[context] || [];
    const commands = {};

    for (const commandName of commandNames) {
      try {
        commands[commandName] = await lazyLoader.load(commandName);
      } catch (error) {
        console.warn(`Failed to load command ${commandName} for context ${context}:`, error);
      }
    }

    return commands;
  }

  /**
   * Preload patterns based on game phase
   * @param {string} gamePhase Current game phase
   */
  static async preloadForGamePhase(gamePhase) {
    const phaseModules = {
      'initialization': ['CommandManager', 'EntityFactory'],
      'gameplay': ['MoveCommand', 'AttackCommand'],
      'building': ['BuildCommand'],
      'endgame': [] // Victory modules would go here when added
    };

    const modules = phaseModules[gamePhase] || [];
    
    if (modules.length > 0) {
      console.log(`Preloading modules for game phase: ${gamePhase}`);
      await lazyLoader.preloadModules(modules, { concurrent: 2 });
    }
  }

  /**
   * Get pattern loading statistics
   * @returns {Object} Loading performance statistics
   */
  static getLoadingStatistics() {
    return lazyLoader.getStatistics();
  }

  /**
   * Clear pattern cache (for development/testing)
   */
  static clearPatternCache() {
    lazyLoader.clearCache();
  }
}
