/**
 * CommandManager - Manages command execution and history
 * Provides centralized command processing with undo/redo support
 */

import { Command } from './Command.js';

export class CommandManager {
  constructor(maxHistorySize = 50) {
    this.commandHistory = [];
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = maxHistorySize;
    
    // Event listeners for command events
    this.listeners = {
      commandExecuted: [],
      commandUndone: [],
      commandRedone: [],
      commandFailed: []
    };
  }

  /**
   * Execute a command
   * @param {Command} command Command to execute
   * @returns {Object} Execution result
   */
  executeCommand(command) {
    if (!(command instanceof Command)) {
      const error = 'Invalid command: must extend Command class';
      this.emit('commandFailed', { error, command });
      return { success: false, error };
    }

    if (!command.canExecute()) {
      const error = 'Command cannot be executed';
      this.emit('commandFailed', { error, command, reason: 'canExecute() returned false' });
      return { success: false, error };
    }

    // Execute the command
    const result = command.execute();
    
    if (result.success) {
      // Add to history and undo stack
      this.addToHistory(command);
      this.undoStack.push(command);
      
      // Clear redo stack when new command is executed
      this.redoStack = [];
      
      // Limit undo stack size
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }
      
      this.emit('commandExecuted', { command, result });
    } else {
      this.emit('commandFailed', { command, result });
    }

    return result;
  }

  /**
   * Undo the last command
   * @returns {Object} Undo result
   */
  undo() {
    if (this.undoStack.length === 0) {
      return { success: false, error: 'Nothing to undo' };
    }

    const command = this.undoStack.pop();
    
    if (!command.canUndo()) {
      // Put it back if it can't be undone
      this.undoStack.push(command);
      return { success: false, error: 'Command cannot be undone' };
    }

    const result = command.undo();
    
    if (result.success) {
      this.redoStack.push(command);
      this.emit('commandUndone', { command, result });
    } else {
      // Put it back if undo failed
      this.undoStack.push(command);
      this.emit('commandFailed', { command, result, action: 'undo' });
    }

    return result;
  }

  /**
   * Redo the last undone command
   * @returns {Object} Redo result
   */
  redo() {
    if (this.redoStack.length === 0) {
      return { success: false, error: 'Nothing to redo' };
    }

    const command = this.redoStack.pop();
    const result = command.execute();
    
    if (result.success) {
      this.undoStack.push(command);
      this.emit('commandRedone', { command, result });
    } else {
      // Put it back if redo failed
      this.redoStack.push(command);
      this.emit('commandFailed', { command, result, action: 'redo' });
    }

    return result;
  }

  /**
   * Add command to history
   * @param {Command} command Command to add
   */
  addToHistory(command) {
    this.commandHistory.push({
      command: command,
      metadata: command.getMetadata(),
      timestamp: Date.now()
    });

    // Limit history size
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  /**
   * Get command history
   * @returns {Array} Command history
   */
  getHistory() {
    return [...this.commandHistory];
  }

  /**
   * Get recent commands
   * @param {number} count Number of recent commands to get
   * @returns {Array} Recent commands
   */
  getRecentCommands(count = 10) {
    return this.commandHistory.slice(-count);
  }

  /**
   * Check if undo is available
   * @returns {boolean} True if undo is available
   */
  canUndo() {
    return this.undoStack.length > 0 && 
           this.undoStack[this.undoStack.length - 1].canUndo();
  }

  /**
   * Check if redo is available
   * @returns {boolean} True if redo is available
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo stack size
   * @returns {number} Number of commands that can be undone
   */
  getUndoStackSize() {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   * @returns {number} Number of commands that can be redone
   */
  getRedoStackSize() {
    return this.redoStack.length;
  }

  /**
   * Clear all command history and stacks
   */
  clear() {
    this.commandHistory = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get statistics about command usage
   * @returns {Object} Command statistics
   */
  getStatistics() {
    const commandTypes = {};
    const totalCommands = this.commandHistory.length;
    
    this.commandHistory.forEach(entry => {
      const type = entry.metadata.type;
      commandTypes[type] = (commandTypes[type] || 0) + 1;
    });

    return {
      totalCommands,
      commandTypes,
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  // Event system for command manager
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Create a batch command that executes multiple commands together
   * @param {Array<Command>} commands Commands to batch
   * @returns {Command} Batch command
   */
  createBatchCommand(commands) {
    return new BatchCommand(commands);
  }
}

/**
 * BatchCommand - Executes multiple commands as a single unit
 */
class BatchCommand extends Command {
  constructor(commands) {
    super();
    this.commands = commands || [];
    this.executedCommands = [];
  }

  canExecute() {
    return this.commands.length > 0 && 
           this.commands.every(cmd => cmd.canExecute());
  }

  execute() {
    if (!this.canExecute()) {
      return { success: false, error: 'Batch command cannot be executed' };
    }

    const results = [];
    
    for (const command of this.commands) {
      const result = command.execute();
      results.push(result);
      
      if (result.success) {
        this.executedCommands.push(command);
      } else {
        // If any command fails, undo all executed commands
        this.undoExecutedCommands();
        return { 
          success: false, 
          error: 'Batch command failed', 
          failedCommand: command,
          results 
        };
      }
    }

    this.executed = true;
    return { 
      success: true, 
      commandCount: this.commands.length,
      results 
    };
  }

  undo() {
    if (!this.canUndo()) {
      return { success: false, error: 'Batch command cannot be undone' };
    }

    return this.undoExecutedCommands();
  }

  undoExecutedCommands() {
    const results = [];
    
    // Undo in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i];
      if (command.canUndo()) {
        const result = command.undo();
        results.push(result);
      }
    }

    this.executedCommands = [];
    this.executed = false;
    
    return { success: true, undoResults: results };
  }

  getDescription() {
    return `Batch command (${this.commands.length} commands)`;
  }
}