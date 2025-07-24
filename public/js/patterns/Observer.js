/**
 * Observer Pattern - Enhanced event system for game state management
 * Provides structured event handling with type safety and debugging support
 */

export class EventEmitter {
  constructor() {
    this.listeners = new Map();
    this.maxListeners = 50;
    this.debugMode = false;
  }

  /**
   * Add event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function
   * @param {Object} options Listener options
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event);

    if (listeners.length >= this.maxListeners) {
      console.warn(`Event '${event}' has reached maximum listeners (${this.maxListeners})`);
    }

    const listenerInfo = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: this.generateListenerId()
    };

    listeners.push(listenerInfo);

    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(`Added listener for '${event}' (ID: ${listenerInfo.id})`);
    }

    return listenerInfo.id;
  }

  /**
   * Add one-time event listener
   * @param {string} event Event name
   * @param {Function} callback Callback function
   * @param {Object} options Listener options
   */
  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * Remove event listener
   * @param {string} event Event name
   * @param {Function|string} callbackOrId Callback function or listener ID
   */
  off(event, callbackOrId) {
    const listeners = this.listeners.get(event);
    if (!listeners) return false;

    let removed = false;

    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i];

      if (typeof callbackOrId === 'string') {
        // Remove by ID
        if (listener.id === callbackOrId) {
          listeners.splice(i, 1);
          removed = true;
          break;
        }
      } else if (listener.callback === callbackOrId) {
        // Remove by callback function
        listeners.splice(i, 1);
        removed = true;
        break;
      }
    }

    if (listeners.length === 0) {
      this.listeners.delete(event);
    }

    if (this.debugMode && removed) {
      console.log(`Removed listener for '${event}'`);
    }

    return removed;
  }

  /**
   * Remove all listeners for an event
   * @param {string} event Event name
   */
  removeAllListeners(event) {
    if (event) {
      const count = this.listeners.get(event)?.length || 0;
      this.listeners.delete(event);

      if (this.debugMode && count > 0) {
        console.log(`Removed ${count} listeners for '${event}'`);
      }

      return count;
    } else {
      // Remove all listeners for all events
      const totalCount = Array.from(this.listeners.values())
        .reduce((sum, listeners) => sum + listeners.length, 0);
      this.listeners.clear();

      if (this.debugMode && totalCount > 0) {
        console.log(`Removed all ${totalCount} listeners`);
      }

      return totalCount;
    }
  }

  /**
   * Emit event to all listeners
   * @param {string} event Event name
   * @param {*} data Event data
   */
  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      if (this.debugMode) {
        console.log(`No listeners for event '${event}'`);
      }
      return false;
    }

    const toRemove = [];
    let emitCount = 0;

    for (const listener of listeners) {
      try {
        listener.callback(data, event);
        emitCount++;

        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(`Error in event listener for '${event}':`, error);
      }
    }

    // Remove one-time listeners
    for (const listener of toRemove) {
      this.off(event, listener.id);
    }

    if (this.debugMode) {
      console.log(`Emitted '${event}' to ${emitCount} listeners`, data);
    }

    return emitCount > 0;
  }

  /**
   * Get listener count for an event
   * @param {string} event Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * Get all event names that have listeners
   * @returns {Array<string>} Array of event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Set maximum number of listeners per event
   * @param {number} max Maximum listeners
   */
  setMaxListeners(max) {
    this.maxListeners = Math.max(1, max);
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
  }

  /**
   * Generate unique listener ID
   * @returns {string} Unique ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get event statistics
   * @returns {Object} Event statistics
   */
  getStatistics() {
    const stats = {
      totalEvents: this.listeners.size,
      totalListeners: 0,
      eventBreakdown: {}
    };

    for (const [event, listeners] of this.listeners) {
      stats.totalListeners += listeners.length;
      stats.eventBreakdown[event] = {
        listenerCount: listeners.length,
        hasOnceListeners: listeners.some(l => l.once),
        priorities: listeners.map(l => l.priority)
      };
    }

    return stats;
  }
}

/**
 * Observable - Base class for objects that emit events
 */
export class Observable extends EventEmitter {
  constructor() {
    super();
    this.state = {};
    this.previousState = {};
  }

  /**
   * Set state and emit change events
   * @param {string} key State key
   * @param {*} value New value
   * @param {boolean} silent Skip event emission
   */
  setState(key, value, silent = false) {
    const oldValue = this.state[key];

    if (oldValue !== value) {
      this.previousState[key] = oldValue;
      this.state[key] = value;

      if (!silent) {
        this.emit('stateChanged', { key, value, oldValue });
        this.emit(`${key}Changed`, { value, oldValue });
      }
    }
  }

  /**
   * Get state value
   * @param {string} key State key
   * @returns {*} State value
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Get previous state value
   * @param {string} key State key
   * @returns {*} Previous state value
   */
  getPreviousState(key) {
    return this.previousState[key];
  }

  /**
   * Get all state
   * @returns {Object} Current state
   */
  getAllState() {
    return { ...this.state };
  }
}

/**
 * GameEventTypes - Centralized event type definitions
 */
export const GameEventTypes = {
  // Game lifecycle
  GAME_STARTED: 'gameStarted',
  GAME_ENDED: 'gameEnded',
  GAME_PAUSED: 'gamePaused',
  GAME_RESUMED: 'gameResumed',

  // Turn management
  TURN_STARTED: 'turnStarted',
  TURN_ENDED: 'turnEnded',
  PHASE_CHANGED: 'phaseChanged',

  // Unit events
  UNIT_CREATED: 'unitCreated',
  UNIT_MOVED: 'unitMoved',
  UNIT_ATTACKED: 'unitAttacked',
  UNIT_DESTROYED: 'unitDestroyed',
  UNIT_SELECTED: 'unitSelected',
  UNIT_DESELECTED: 'unitDeselected',

  // Base events
  BASE_CREATED: 'baseCreated',
  BASE_ATTACKED: 'baseAttacked',
  BASE_DESTROYED: 'baseDestroyed',

  // Resource events
  RESOURCES_GATHERED: 'resourcesGathered',
  RESOURCE_NODE_DEPLETED: 'resourceNodeDepleted',

  // Player events
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_SURRENDERED: 'playerSurrendered',

  // UI events
  CELL_SELECTED: 'cellSelected',
  CELL_HOVERED: 'cellHovered',

  // Command events
  COMMAND_EXECUTED: 'commandExecuted',
  COMMAND_UNDONE: 'commandUndone',

  // Victory events
  VICTORY_ACHIEVED: 'victoryAchieved',
  DRAW_DECLARED: 'drawDeclared'
};

/**
 * EventData - Helper class for creating structured event data
 */
export class EventData {
  static gameStarted(gameState) {
    return {
      timestamp: Date.now(),
      players: Array.from(gameState.players.keys()),
      gameMode: gameState.gameMode || 'standard'
    };
  }

  static turnStarted(turnNumber, playerId) {
    return {
      timestamp: Date.now(),
      turnNumber,
      player: playerId
    };
  }

  static unitMoved(unit, from, to, cost) {
    return {
      timestamp: Date.now(),
      unit: { id: unit.id, type: unit.type, playerId: unit.playerId },
      from: { ...from },
      to: { ...to },
      movementCost: cost
    };
  }

  static unitAttacked(attacker, target, damage, destroyed) {
    return {
      timestamp: Date.now(),
      attacker: { id: attacker.id, type: attacker.type, playerId: attacker.playerId },
      target: { id: target.id, type: target.type, playerId: target.playerId },
      damage,
      targetDestroyed: destroyed
    };
  }

  static resourcesGathered(playerId, amount, nodePosition) {
    return {
      timestamp: Date.now(),
      playerId,
      amount,
      nodePosition: { ...nodePosition }
    };
  }
}
