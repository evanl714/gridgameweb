import { Observable } from '../patterns/Observer.js';
import { GameEventTypes } from '../patterns/Observer.js';

/**
 * GameStateManager - Centralized game state management service
 *
 * Replaces direct access to window.game with a proper service
 * Provides controlled access to game state and emits events for state changes
 */
class GameStateManager extends Observable {
  constructor(eventEmitter) {
    super();
    this.eventEmitter = eventEmitter;
    this.gameInstance = null;
    this.initialized = false;

    // State proxy for controlled access
    this.stateProxy = null;

    // Cached state properties for performance
    this.cachedState = {
      players: [],
      currentPlayer: null,
      turn: 0,
      phase: 'movement',
      units: [],
      bases: [],
      resources: [],
      gameStatus: 'waiting'
    };

    this.setupEventHandlers();
  }

  /**
     * Initialize the GameStateManager with a game instance
     * @param {Object} gameInstance - The main game instance
     */
  initialize(gameInstance) {
    if (this.initialized) {
      throw new Error('GameStateManager already initialized');
    }

    this.gameInstance = gameInstance;
    this.updateCachedState();
    this.createStateProxy();
    this.setupGameInstanceEventForwarding();
    this.initialized = true;

    this.emit('initialized', { gameInstance });
    console.log('GameStateManager initialized');
  }

  /**
     * Get the current game state
     * @returns {Object} Current game state (read-only copy)
     */
  getState() {
    if (!this.initialized) {
      throw new Error('GameStateManager not initialized');
    }

    // Return deep copy to prevent external mutations
    return JSON.parse(JSON.stringify(this.cachedState));
  }

  /**
     * Get a specific state property
     * @param {string} property - Property name
     * @returns {*} Property value
     */
  getProperty(property) {
    if (!this.initialized) {
      return null;
    }

    return this.cachedState[property];
  }

  /**
     * Update game state properties
     * @param {Object} updates - State updates to apply
     * @param {boolean} emit - Whether to emit change events (default: true)
     */
  updateState(updates, emit = true) {
    if (!this.initialized) {
      throw new Error('GameStateManager not initialized');
    }

    const previousState = { ...this.cachedState };

    // Apply updates to cached state
    Object.assign(this.cachedState, updates);

    // Update game instance if available
    if (this.gameInstance && this.gameInstance.gameState) {
      Object.assign(this.gameInstance.gameState, updates);
    }

    if (emit) {
      this.emit('stateChanged', {
        previous: previousState,
        current: this.cachedState,
        changes: updates
      });

      // Emit specific property change events
      Object.keys(updates).forEach(key => {
        this.emit(`${key}Changed`, {
          previous: previousState[key],
          current: this.cachedState[key]
        });
      });
    }
  }

  /**
     * Get current player information
     * @returns {Object|null} Current player object
     */
  getCurrentPlayer() {
    return this.getProperty('currentPlayer');
  }

  /**
     * Get current turn number
     * @returns {number} Current turn number
     */
  getCurrentTurn() {
    return this.getProperty('turn') || 0;
  }

  /**
     * Get current game phase
     * @returns {string} Current phase (movement, combat, build, etc.)
     */
  getCurrentPhase() {
    return this.getProperty('phase') || 'movement';
  }

  /**
     * Get all units in the game
     * @returns {Array} Array of unit objects
     */
  getUnits() {
    return this.getProperty('units') || [];
  }

  /**
     * Get units belonging to a specific player
     * @param {number|string} playerId - Player ID
     * @returns {Array} Array of player's units
     */
  getPlayerUnits(playerId) {
    const units = this.getUnits();
    return units.filter(unit => unit.playerId === playerId);
  }

  /**
     * Get all bases in the game
     * @returns {Array} Array of base objects
     */
  getBases() {
    return this.getProperty('bases') || [];
  }

  /**
     * Get player resources
     * @param {number|string} playerId - Player ID (optional, defaults to current player)
     * @returns {Object} Player resources
     */
  getPlayerResources(playerId = null) {
    const targetPlayer = playerId || this.getCurrentPlayer()?.id;
    const players = this.getProperty('players') || [];
    const player = players.find(p => p.id === targetPlayer);
    return player?.resources || {};
  }

  /**
     * Get game status
     * @returns {string} Game status (waiting, playing, paused, ended)
     */
  getGameStatus() {
    return this.getProperty('gameStatus') || 'waiting';
  }

  /**
     * Check if game is in progress
     * @returns {boolean} True if game is active
     */
  isGameActive() {
    const status = this.getGameStatus();
    return status === 'playing' || status === 'paused';
  }

  /**
     * Update cached state from game instance
     */
  updateCachedState() {
    if (!this.gameInstance || !this.gameInstance.gameState) {
      return;
    }

    const gameState = this.gameInstance.gameState;

    this.cachedState = {
      players: gameState.players || [],
      currentPlayer: gameState.currentPlayer,
      turn: gameState.turn,
      phase: gameState.phase,
      units: gameState.units || [],
      bases: gameState.bases || [],
      resources: gameState.resources || [],
      gameStatus: gameState.gameStatus || 'waiting',

      // Additional derived state
      isGameActive: this.isGameActive(),
      playerCount: (gameState.players || []).length,
      unitCount: (gameState.units || []).length
    };
  }

  /**
     * Create a proxy for controlled state access
     */
  createStateProxy() {
    this.stateProxy = new Proxy(this.cachedState, {
      get: (target, property) => {
        return target[property];
      },
      set: (target, property, value) => {
        console.warn(`Direct state mutation attempted: ${property}. Use updateState() instead.`);
        return false; // Prevent direct mutations
      }
    });
  }

  /**
     * Setup event forwarding from game instance
     */
  setupGameInstanceEventForwarding() {
    if (!this.gameInstance || typeof this.gameInstance.on !== 'function') {
      return;
    }

    // Forward key game events
    const eventsToForward = [
      GameEventTypes.GAME_STARTED,
      GameEventTypes.GAME_ENDED,
      GameEventTypes.TURN_STARTED,
      GameEventTypes.TURN_ENDED,
      GameEventTypes.PHASE_CHANGED,
      GameEventTypes.UNIT_MOVED,
      GameEventTypes.UNIT_CREATED,
      GameEventTypes.UNIT_DESTROYED,
      GameEventTypes.RESOURCES_CHANGED,
      GameEventTypes.PLAYER_CHANGED
    ];

    eventsToForward.forEach(eventType => {
      this.gameInstance.on(eventType, (data) => {
        this.updateCachedState();
        this.emit(eventType, data);
      });
    });
  }

  /**
     * Setup internal event handlers
     */
  setupEventHandlers() {
    // Handle state synchronization
    this.on('stateChanged', () => {
      this.updateCachedState();
    });
  }

  /**
     * Execute a game action safely
     * @param {string} action - Action name
     * @param {...*} args - Action arguments
     * @returns {Promise<*>} Action result
     */
  async executeAction(action, ...args) {
    if (!this.initialized || !this.gameInstance) {
      throw new Error('GameStateManager not ready for actions');
    }

    if (typeof this.gameInstance[action] !== 'function') {
      throw new Error(`Action '${action}' not available`);
    }

    try {
      const result = await this.gameInstance[action](...args);
      this.updateCachedState();

      this.emit('actionExecuted', {
        action,
        args,
        result
      });

      return result;
    } catch (error) {
      this.emit('actionFailed', {
        action,
        args,
        error: error.message
      });
      throw error;
    }
  }

  /**
     * Get available actions
     * @returns {Array<string>} Available action names
     */
  getAvailableActions() {
    if (!this.gameInstance) return [];

    // Return common game actions
    return [
      'startGame',
      'endTurn',
      'moveUnit',
      'buildUnit',
      'gatherResources',
      'nextPhase',
      'pauseGame',
      'resumeGame'
    ].filter(action => typeof this.gameInstance[action] === 'function');
  }

  /**
     * Subscribe to specific state changes
     * @param {string} property - State property to watch
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
  watchProperty(property, callback) {
    const eventName = `${property}Changed`;
    this.on(eventName, callback);

    return () => this.off(eventName, callback);
  }

  /**
     * Get game instance safely (for backward compatibility)
     * @returns {Object|null} Game instance
     */
  getGameInstance() {
    return this.gameInstance;
  }

  /**
     * Dispose of the GameStateManager
     */
  dispose() {
    this.removeAllListeners();
    this.gameInstance = null;
    this.stateProxy = null;
    this.initialized = false;
  }

  /**
     * Get manager status for debugging
     * @returns {Object} Status information
     */
  getStatus() {
    return {
      initialized: this.initialized,
      hasGameInstance: !!this.gameInstance,
      stateKeys: Object.keys(this.cachedState),
      listenerCount: this.listenerCount(),
      gameStatus: this.getGameStatus()
    };
  }
}

export default GameStateManager;
