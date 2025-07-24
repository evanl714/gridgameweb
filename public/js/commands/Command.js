/**
 * Command Pattern - Base Command interface
 * Provides structure for encapsulating game actions as objects
 */

export class Command {
  constructor() {
    this.executed = false;
    this.timestamp = Date.now();
  }

  /**
   * Execute the command
   * @returns {Object} Result object with success flag and data
   */
  execute() {
    throw new Error('Command.execute() must be implemented by subclass');
  }

  /**
   * Undo the command (if supported)
   * @returns {Object} Result object with success flag and data
   */
  undo() {
    throw new Error('Command.undo() must be implemented by subclass');
  }

  /**
   * Check if this command can be executed
   * @returns {boolean} True if command can be executed
   */
  canExecute() {
    return true;
  }

  /**
   * Check if this command can be undone
   * @returns {boolean} True if command can be undone
   */
  canUndo() {
    return this.executed;
  }

  /**
   * Get command description for logging/UI
   * @returns {string} Human readable description
   */
  getDescription() {
    return 'Generic command';
  }

  /**
   * Get command metadata
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      type: this.constructor.name,
      executed: this.executed,
      timestamp: this.timestamp,
      description: this.getDescription()
    };
  }
}
