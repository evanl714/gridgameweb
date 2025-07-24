import { Observable } from '../patterns/Observer.js';
import { GameEventTypes } from '../patterns/Observer.js';

/**
 * TurnManagerService - Centralized turn and phase management
 *
 * Handles turn progression, phase transitions, and turn-based game logic
 * Replaces direct access to turn management through global state
 */
class TurnManagerService extends Observable {
  constructor(gameStateManager, eventEmitter) {
    super();
    this.gameStateManager = gameStateManager;
    this.eventEmitter = eventEmitter;

    // Turn configuration
    this.phases = ['movement', 'combat', 'build', 'resources'];
    this.currentPhaseIndex = 0;
    this.turnDuration = null; // Optional turn timer
    this.autoAdvance = false;

    // Turn state
    this.turnState = {
      currentTurn: 0,
      currentPhase: 'movement',
      currentPlayerIndex: 0,
      isProcessing: false,
      isPaused: false,
      turnStartTime: null,
      phaseStartTime: null
    };

    // Phase validation functions
    this.phaseValidators = new Map();
    this.phaseHandlers = new Map();

    this.setupEventHandlers();
    this.initializePhaseHandlers();
  }

  /**
     * Start a new turn
     * @param {Object} options - Turn start options
     * @returns {Promise<Object>} Turn start result
     */
  async startTurn(options = {}) {
    if (this.turnState.isProcessing) {
      throw new Error('Turn transition already in progress');
    }

    this.turnState.isProcessing = true;
    const previousTurn = this.turnState.currentTurn;

    try {
      // Increment turn counter
      this.turnState.currentTurn++;
      this.turnState.currentPhase = this.phases[0];
      this.currentPhaseIndex = 0;
      this.turnState.turnStartTime = Date.now();
      this.turnState.phaseStartTime = Date.now();

      // Update game state
      await this.gameStateManager.updateState({
        turn: this.turnState.currentTurn,
        phase: this.turnState.currentPhase
      });

      // Emit turn start event
      const turnData = {
        turn: this.turnState.currentTurn,
        previousTurn,
        phase: this.turnState.currentPhase,
        player: this.getCurrentPlayer(),
        timestamp: this.turnState.turnStartTime
      };

      this.emit(GameEventTypes.TURN_STARTED, turnData);
      this.eventEmitter?.emit(GameEventTypes.TURN_STARTED, turnData);

      // Execute turn start logic
      await this.executePhaseStart();

      return turnData;

    } catch (error) {
      this.emit('turnStartFailed', { error: error.message, turn: this.turnState.currentTurn });
      throw error;
    } finally {
      this.turnState.isProcessing = false;
    }
  }

  /**
     * End the current turn
     * @param {Object} options - Turn end options
     * @returns {Promise<Object>} Turn end result
     */
  async endTurn(options = {}) {
    if (this.turnState.isProcessing) {
      throw new Error('Turn transition already in progress');
    }

    this.turnState.isProcessing = true;
    const currentTurn = this.turnState.currentTurn;

    try {
      // Validate turn can end
      const canEnd = await this.validateTurnEnd();
      if (!canEnd.valid) {
        throw new Error(`Cannot end turn: ${canEnd.reason}`);
      }

      // Execute turn end logic
      await this.executePhaseEnd();

      // Advance to next player
      await this.advancePlayer();

      const turnEndData = {
        turn: currentTurn,
        nextTurn: this.turnState.currentTurn,
        player: this.getCurrentPlayer(),
        duration: Date.now() - this.turnState.turnStartTime
      };

      this.emit(GameEventTypes.TURN_ENDED, turnEndData);
      this.eventEmitter?.emit(GameEventTypes.TURN_ENDED, turnEndData);

      // Auto-start next turn if configured
      if (this.autoAdvance) {
        await this.startTurn();
      }

      return turnEndData;

    } catch (error) {
      this.emit('turnEndFailed', { error: error.message, turn: currentTurn });
      throw error;
    } finally {
      this.turnState.isProcessing = false;
    }
  }

  /**
     * Advance to next phase
     * @returns {Promise<Object>} Phase change result
     */
  async nextPhase() {
    if (this.turnState.isProcessing) {
      throw new Error('Phase transition already in progress');
    }

    this.turnState.isProcessing = true;
    const previousPhase = this.turnState.currentPhase;

    try {
      // Validate current phase can end
      const canAdvance = await this.validatePhaseAdvance();
      if (!canAdvance.valid) {
        throw new Error(`Cannot advance phase: ${canAdvance.reason}`);
      }

      // Execute current phase end logic
      await this.executePhaseEnd();

      // Advance to next phase
      this.currentPhaseIndex = (this.currentPhaseIndex + 1) % this.phases.length;
      this.turnState.currentPhase = this.phases[this.currentPhaseIndex];
      this.turnState.phaseStartTime = Date.now();

      // If we've cycled through all phases, this might trigger turn end
      const isNewTurn = this.currentPhaseIndex === 0;

      // Update game state
      await this.gameStateManager.updateState({
        phase: this.turnState.currentPhase
      });

      const phaseData = {
        previousPhase,
        currentPhase: this.turnState.currentPhase,
        turn: this.turnState.currentTurn,
        isNewTurn,
        player: this.getCurrentPlayer()
      };

      this.emit(GameEventTypes.PHASE_CHANGED, phaseData);
      this.eventEmitter?.emit(GameEventTypes.PHASE_CHANGED, phaseData);

      // Execute new phase start logic
      await this.executePhaseStart();

      return phaseData;

    } catch (error) {
      this.emit('phaseChangeFailed', { error: error.message, phase: previousPhase });
      throw error;
    } finally {
      this.turnState.isProcessing = false;
    }
  }

  /**
     * Get current turn information
     * @returns {Object} Current turn data
     */
  getCurrentTurnInfo() {
    return {
      turn: this.turnState.currentTurn,
      phase: this.turnState.currentPhase,
      phaseIndex: this.currentPhaseIndex,
      player: this.getCurrentPlayer(),
      isProcessing: this.turnState.isProcessing,
      isPaused: this.turnState.isPaused,
      turnDuration: this.turnState.turnStartTime ? Date.now() - this.turnState.turnStartTime : 0,
      phaseDuration: this.turnState.phaseStartTime ? Date.now() - this.turnState.phaseStartTime : 0
    };
  }

  /**
     * Get current player from game state
     * @returns {Object|null} Current player
     */
  getCurrentPlayer() {
    return this.gameStateManager.getCurrentPlayer();
  }

  /**
     * Pause the current turn
     */
  pauseTurn() {
    this.turnState.isPaused = true;
    this.emit('turnPaused', this.getCurrentTurnInfo());
  }

  /**
     * Resume the paused turn
     */
  resumeTurn() {
    this.turnState.isPaused = false;
    this.emit('turnResumed', this.getCurrentTurnInfo());
  }

  /**
     * Check if it's a specific player's turn
     * @param {string|number} playerId - Player ID to check
     * @returns {boolean} True if it's the player's turn
     */
  isPlayerTurn(playerId) {
    const currentPlayer = this.getCurrentPlayer();
    return currentPlayer && currentPlayer.id === playerId;
  }

  /**
     * Check if we're in a specific phase
     * @param {string} phase - Phase name to check
     * @returns {boolean} True if in the specified phase
     */
  isPhase(phase) {
    return this.turnState.currentPhase === phase;
  }

  /**
     * Set turn duration (optional timer)
     * @param {number} duration - Duration in milliseconds
     */
  setTurnDuration(duration) {
    this.turnDuration = duration;
  }

  /**
     * Enable or disable auto-advance
     * @param {boolean} enabled - Whether to auto-advance turns
     */
  setAutoAdvance(enabled) {
    this.autoAdvance = enabled;
  }

  /**
     * Register a phase validator
     * @param {string} phase - Phase name
     * @param {Function} validator - Validation function
     */
  registerPhaseValidator(phase, validator) {
    this.phaseValidators.set(phase, validator);
  }

  /**
     * Register a phase handler
     * @param {string} phase - Phase name
     * @param {Object} handlers - Phase handlers { onStart, onEnd }
     */
  registerPhaseHandler(phase, handlers) {
    this.phaseHandlers.set(phase, handlers);
  }

  /**
     * Validate if turn can end
     * @returns {Promise<Object>} Validation result
     */
  async validateTurnEnd() {
    // Check if all phases completed
    if (this.currentPhaseIndex !== this.phases.length - 1) {
      return { valid: false, reason: 'Not all phases completed' };
    }

    // Check current phase validator
    const validator = this.phaseValidators.get(this.turnState.currentPhase);
    if (validator) {
      const result = await validator();
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  /**
     * Validate if phase can advance
     * @returns {Promise<Object>} Validation result
     */
  async validatePhaseAdvance() {
    const validator = this.phaseValidators.get(this.turnState.currentPhase);
    if (validator) {
      return await validator();
    }

    return { valid: true };
  }

  /**
     * Execute phase start logic
     */
  async executePhaseStart() {
    const handler = this.phaseHandlers.get(this.turnState.currentPhase);
    if (handler && handler.onStart) {
      await handler.onStart(this.getCurrentTurnInfo());
    }
  }

  /**
     * Execute phase end logic
     */
  async executePhaseEnd() {
    const handler = this.phaseHandlers.get(this.turnState.currentPhase);
    if (handler && handler.onEnd) {
      await handler.onEnd(this.getCurrentTurnInfo());
    }
  }

  /**
     * Advance to next player
     */
  async advancePlayer() {
    const players = this.gameStateManager.getProperty('players') || [];
    if (players.length === 0) return;

    this.turnState.currentPlayerIndex = (this.turnState.currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[this.turnState.currentPlayerIndex];

    await this.gameStateManager.updateState({
      currentPlayer: nextPlayer
    });
  }

  /**
     * Initialize default phase handlers
     */
  initializePhaseHandlers() {
    // Movement phase
    this.registerPhaseHandler('movement', {
      onStart: async () => {
        console.log('Movement phase started');
      },
      onEnd: async () => {
        console.log('Movement phase ended');
      }
    });

    // Combat phase
    this.registerPhaseHandler('combat', {
      onStart: async () => {
        console.log('Combat phase started');
      },
      onEnd: async () => {
        console.log('Combat phase ended');
      }
    });

    // Build phase
    this.registerPhaseHandler('build', {
      onStart: async () => {
        console.log('Build phase started');
      },
      onEnd: async () => {
        console.log('Build phase ended');
      }
    });

    // Resources phase
    this.registerPhaseHandler('resources', {
      onStart: async () => {
        console.log('Resources phase started');
      },
      onEnd: async () => {
        console.log('Resources phase ended');
      }
    });
  }

  /**
     * Setup event handlers
     */
  setupEventHandlers() {
    // Listen to game state changes
    this.gameStateManager.on('stateChanged', (data) => {
      // Sync turn state with game state if needed
      if (data.changes.turn !== undefined) {
        this.turnState.currentTurn = data.changes.turn;
      }
      if (data.changes.phase !== undefined) {
        this.turnState.currentPhase = data.changes.phase;
      }
    });
  }

  /**
     * Get service status for debugging
     * @returns {Object} Status information
     */
  getStatus() {
    return {
      turnState: { ...this.turnState },
      phases: [...this.phases],
      currentPhaseIndex: this.currentPhaseIndex,
      autoAdvance: this.autoAdvance,
      turnDuration: this.turnDuration,
      registeredValidators: Array.from(this.phaseValidators.keys()),
      registeredHandlers: Array.from(this.phaseHandlers.keys())
    };
  }

  /**
     * Reset turn manager to initial state
     */
  reset() {
    this.turnState = {
      currentTurn: 0,
      currentPhase: 'movement',
      currentPlayerIndex: 0,
      isProcessing: false,
      isPaused: false,
      turnStartTime: null,
      phaseStartTime: null
    };
    this.currentPhaseIndex = 0;
  }

  /**
     * Dispose of the TurnManager
     */
  dispose() {
    this.removeAllListeners();
    this.phaseValidators.clear();
    this.phaseHandlers.clear();
  }
}

export default TurnManagerService;
