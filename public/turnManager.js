/**
 * Turn and Phase Management System
 * Handles turn progression, phase transitions, and game timing
 */

import { TURN_CONFIG, GAME_STATES } from '../shared/constants.js';

export class TurnManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.turnTimer = null;
    this.timeRemaining = TURN_CONFIG.TIME_LIMIT;
    this.phases = ['resource', 'action', 'build'];
    this.currentPhaseIndex = 0;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
     * Setup event listeners for game events
     */
  setupEventListeners() {
    this.gameState.on('gameStarted', () => {
      this.startTurn();
    });
  }

  /**
     * Start a new turn for the current player
     */
  startTurn() {
    if (this.gameState.status !== GAME_STATES.PLAYING) {
      return;
    }

    // Turn ending flag will be reset by endTurn() after startTurn() completes

    const currentPlayer = this.gameState.getCurrentPlayer();
    currentPlayer.resetActions();

    // Reset all player units' actions
    this.gameState.getPlayerUnits(currentPlayer.id).forEach(unit => {
      unit.resetActions();
    });

    // Start with resource phase
    this.gameState.currentPhase = 'resource';
    this.currentPhaseIndex = 0;

    // Start turn timer
    this.startTurnTimer();

    // Execute resource phase
    this.executeResourcePhase();

    this.gameState.emit('turnStarted', {
      player: currentPlayer.id,
      turnNumber: this.gameState.turnNumber,
      phase: this.gameState.currentPhase
    });
  }

  /**
     * End the current turn and move to next player
     */
  endTurn() {
    // Prevent double calling of endTurn
    if (this.endingTurn) {
      return;
    }
    this.endingTurn = true;

    try {
      this.stopTurnTimer();

      const currentPlayer = this.gameState.getCurrentPlayer();
      if (currentPlayer) {
        currentPlayer.isActive = false;
      }

      // Check victory conditions before moving to next player
      this.gameState.checkVictoryCondition();
      this.checkWinConditions();

      // Exit early if game has ended
      if (this.gameState.status === GAME_STATES.ENDED) {
        return;
      }

      // Move to next player
      this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
      this.gameState.turnNumber++;

      const nextPlayer = this.gameState.getCurrentPlayer();
      if (nextPlayer) {
        nextPlayer.isActive = true;
      }

      this.gameState.emit('turnEnded', {
        previousPlayer: currentPlayer ? currentPlayer.id : null,
        nextPlayer: nextPlayer ? nextPlayer.id : null,
        turnNumber: this.gameState.turnNumber
      });

      // Start next turn
      this.startTurn();
    } finally {
      // Reset the flag after turn processing is complete (always runs)
      this.endingTurn = false;
    }
  }

  /**
     * Advance to the next phase or end turn
     */
  nextPhase() {
    this.currentPhaseIndex++;

    if (this.currentPhaseIndex >= this.phases.length) {
      // All phases complete, end turn
      this.endTurn();
      return;
    }

    const newPhase = this.phases[this.currentPhaseIndex];
    this.gameState.currentPhase = newPhase;

    // Execute phase-specific logic
    switch (newPhase) {
    case 'action':
      this.executeActionPhase();
      break;
    case 'build':
      this.executeBuildPhase();
      break;
    }

    this.gameState.emit('phaseChanged', {
      phase: newPhase,
      player: this.gameState.currentPlayer
    });
  }

  /**
     * Execute resource phase logic
     */
  executeResourcePhase() {
    const currentPlayer = this.gameState.getCurrentPlayer();

    // Generate base energy
    const baseEnergyGain = 10;
    currentPlayer.addEnergy(baseEnergyGain);

    // Calculate resource bonuses from units near resource nodes
    let resourceBonus = 0;
    const playerUnits = this.gameState.getPlayerUnits(currentPlayer.id);

    playerUnits.forEach(unit => {
      if (unit.type === 'worker') {
        resourceBonus += this.calculateResourceBonus(unit);
      }
    });

    currentPlayer.addEnergy(resourceBonus);
    currentPlayer.resourcesGathered += resourceBonus;

    this.gameState.emit('resourcePhaseComplete', {
      player: currentPlayer.id,
      energyGained: baseEnergyGain + resourceBonus,
      resourceBonus: resourceBonus
    });

    // Auto-advance from resource phase after 1 second
    setTimeout(() => {
      // Only auto-advance if turn hasn't been manually ended
      if (this.gameState.currentPhase === 'resource' && !this.endingTurn) {
        this.nextPhase();
      }
    }, 1000);
  }

  /**
     * Execute action phase logic
     */
  executeActionPhase() {
    // Players can now move units and perform actions
    // This phase is interactive and waits for player input

    this.gameState.emit('actionPhaseStarted', {
      player: this.gameState.currentPlayer,
      actionsRemaining: this.gameState.getCurrentPlayer().actionsRemaining
    });
  }

  /**
     * Execute build phase logic
     */
  executeBuildPhase() {
    // Players can now build units and structures
    // This phase is interactive and waits for player input

    this.gameState.emit('buildPhaseStarted', {
      player: this.gameState.currentPlayer,
      energy: this.gameState.getCurrentPlayer().energy
    });
  }

  /**
     * Calculate resource bonus for a worker unit
     */
  calculateResourceBonus(unit) {
    const resourceNodes = [
      {x: 5, y: 5, value: 15}, {x: 12, y: 5, value: 20}, {x: 19, y: 5, value: 15},
      {x: 5, y: 12, value: 20}, {x: 12, y: 12, value: 25}, {x: 19, y: 12, value: 20},
      {x: 5, y: 19, value: 15}, {x: 12, y: 19, value: 20}, {x: 19, y: 19, value: 15}
    ];

    let bonus = 0;
    resourceNodes.forEach(node => {
      const distance = Math.abs(unit.position.x - node.x) + Math.abs(unit.position.y - node.y);
      if (distance <= 2) { // Adjacent to resource node
        bonus += Math.floor(node.value / Math.max(1, distance));
      }
    });

    return bonus;
  }

  /**
     * Start the turn timer
     */
  startTurnTimer() {
    if (!TURN_CONFIG.TIME_LIMIT) return;

    this.timeRemaining = TURN_CONFIG.TIME_LIMIT;
    this.turnTimer = setInterval(() => {
      this.timeRemaining -= 1000;

      this.gameState.emit('turnTimerTick', {
        timeRemaining: this.timeRemaining,
        totalTime: TURN_CONFIG.TIME_LIMIT
      });

      if (this.timeRemaining <= 0) {
        this.onTimeExpired();
      }
    }, 1000);
  }

  /**
     * Stop the turn timer
     */
  stopTurnTimer() {
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  /**
     * Handle turn time expiration
     */
  onTimeExpired() {
    this.stopTurnTimer();

    if (TURN_CONFIG.AUTO_END_TURN) {
      this.gameState.emit('turnTimeExpired', {
        player: this.gameState.currentPlayer
      });
      this.endTurn();
    }
  }

  /**
     * Force end current turn (player action)
     */
  forceEndTurn() {
    this.gameState.emit('turnForcedEnd', {
      player: this.gameState.currentPlayer
    });
    this.endTurn();
  }

  /**
     * Check if all required actions for phase are complete
     */
  canAdvancePhase() {
    const currentPlayer = this.gameState.getCurrentPlayer();

    switch (this.gameState.currentPhase) {
    case 'resource':
      // Resource phase auto-advances
      return true;
    case 'action':
      // Can advance if no actions remaining or player chooses to
      return currentPlayer.actionsRemaining === 0;
    case 'build':
      // Can advance anytime during build phase
      return true;
    default:
      return true;
    }
  }

  /**
     * Use a player action and check phase completion
     */
  usePlayerAction() {
    const currentPlayer = this.gameState.getCurrentPlayer();
    if (currentPlayer.useAction()) {
      this.gameState.emit('actionUsed', {
        player: currentPlayer.id,
        actionsRemaining: currentPlayer.actionsRemaining
      });

      // Auto-advance from action phase when no actions remain
      if (this.gameState.currentPhase === 'action' &&
                currentPlayer.actionsRemaining === 0) {
        setTimeout(() => {
          // Only auto-advance if turn hasn't been manually ended
          if (!this.endingTurn) {
            this.nextPhase();
          }
        }, 500);
      }

      return true;
    }
    return false;
  }

  /**
     * Get current phase information
     */
  getCurrentPhaseInfo() {
    return {
      phase: this.gameState.currentPhase,
      phaseIndex: this.currentPhaseIndex,
      totalPhases: this.phases.length,
      player: this.gameState.currentPlayer,
      timeRemaining: this.timeRemaining
    };
  }

  /**
     * Check for win conditions
     */
  checkWinConditions() {
    const players = this.gameState.getAllPlayers();

    // Check resource victory (500 resources gathered)
    for (const player of players) {
      if (player.resourcesGathered >= 500) {
        this.gameState.endGame(player.id);
        return player.id;
      }
    }

    // NOTE: No arbitrary turn limits or unit count checks
    // Game only ends on: base destruction, resource victory, surrender, or draw

    return null;
  }

  /**
     * Cleanup resources
     */
  destroy() {
    this.stopTurnTimer();
    this.gameState = null;
  }
}
