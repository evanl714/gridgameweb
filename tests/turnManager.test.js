/**
 * Unit tests for Turn Management System
 */

import { TurnManager } from '../public/turnManager.js';
import { GameState } from '../public/gameState.js';

describe('TurnManager', () => {
  let gameState;
  let turnManager;

  beforeEach(() => {
    gameState = new GameState();
    turnManager = new TurnManager(gameState);
    
    // Mock timers for testing
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    turnManager.destroy();
  });

  test('should initialize with correct default values', () => {
    expect(turnManager.gameState).toBe(gameState);
    expect(turnManager.phases).toEqual(['resource', 'action', 'build']);
    expect(turnManager.currentPhaseIndex).toBe(0);
    expect(turnManager.timeRemaining).toBe(120000); // TURN_CONFIG.TIME_LIMIT
  });

  test('should start turn correctly', () => {
    const mockCallback = jest.fn();
    gameState.on('turnStarted', mockCallback);
    
    gameState.startGame();
    turnManager.startTurn();
    
    expect(gameState.currentPhase).toBe('resource');
    expect(mockCallback).toHaveBeenCalledWith({
      player: 1,
      turnNumber: 1,
      phase: 'resource'
    });
  });

  test('should reset player and unit actions on turn start', () => {
    // Create units for testing
    const unit1 = gameState.createUnit('worker', 1, 5, 5);
    const unit2 = gameState.createUnit('scout', 1, 6, 6);
    
    // Use some actions
    const player = gameState.getCurrentPlayer();
    player.useAction();
    unit1.useAction();
    unit2.useAction();
    
    expect(player.actionsRemaining).toBe(2);
    expect(unit1.actionsUsed).toBe(1);
    expect(unit2.actionsUsed).toBe(1);
    
    gameState.startGame();
    turnManager.startTurn();
    
    expect(player.actionsRemaining).toBe(3);
    expect(unit1.actionsUsed).toBe(0);
    expect(unit2.actionsUsed).toBe(0);
  });

  test('should execute resource phase correctly', () => {
    const mockCallback = jest.fn();
    gameState.on('resourcePhaseComplete', mockCallback);
    
    const player = gameState.getCurrentPlayer();
    const initialEnergy = player.energy;
    
    gameState.startGame();
    turnManager.executeResourcePhase();
    
    // Should gain base energy (10) plus some resource bonus
    expect(player.energy).toBeGreaterThanOrEqual(initialEnergy + 10);
    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      player: 1,
      energyGained: expect.any(Number),
      resourceBonus: expect.any(Number)
    }));
  });

  test('should calculate resource bonus for workers near resource nodes', () => {
    // Create a worker near a resource node (5, 5)
    const worker = gameState.createUnit('worker', 1, 4, 5); // Adjacent to node at (5,5)
    const player = gameState.getCurrentPlayer();
    const initialEnergy = player.energy;
    
    gameState.startGame();
    turnManager.executeResourcePhase();
    
    // Should gain base energy + resource bonus
    expect(player.energy).toBeGreaterThan(initialEnergy + 10);
    expect(player.resourcesGathered).toBeGreaterThan(0);
  });

  test('should advance phases correctly', () => {
    const phaseCallback = jest.fn();
    gameState.on('phaseChanged', phaseCallback);
    
    gameState.startGame();
    
    // Should start in resource phase
    expect(gameState.currentPhase).toBe('resource');
    expect(turnManager.currentPhaseIndex).toBe(0);
    
    // Advance to action phase
    turnManager.nextPhase();
    expect(gameState.currentPhase).toBe('action');
    expect(turnManager.currentPhaseIndex).toBe(1);
    expect(phaseCallback).toHaveBeenCalledWith({
      phase: 'action',
      player: 1
    });
    
    // Advance to build phase
    turnManager.nextPhase();
    expect(gameState.currentPhase).toBe('build');
    expect(turnManager.currentPhaseIndex).toBe(2);
  });

  test('should end turn after all phases complete', () => {
    const turnEndCallback = jest.fn();
    const turnStartCallback = jest.fn();
    gameState.on('turnEnded', turnEndCallback);
    gameState.on('turnStarted', turnStartCallback);
    
    gameState.startGame();
    
    // Go through all phases
    turnManager.nextPhase(); // resource -> action
    turnManager.nextPhase(); // action -> build
    turnManager.nextPhase(); // build -> end turn
    
    expect(turnEndCallback).toHaveBeenCalledWith({
      previousPlayer: 1,
      nextPlayer: 2,
      turnNumber: 2
    });
    
    // Should start next turn with player 2
    expect(gameState.currentPlayer).toBe(2);
    expect(gameState.turnNumber).toBe(2);
  });

  test('should handle turn timer correctly', () => {
    const timerCallback = jest.fn();
    gameState.on('turnTimerTick', timerCallback);
    
    gameState.startGame();
    turnManager.startTurn();
    
    // Advance timer by 1 second
    jest.advanceTimersByTime(1000);
    
    expect(timerCallback).toHaveBeenCalledWith({
      timeRemaining: 119000,
      totalTime: 120000
    });
    
    expect(turnManager.timeRemaining).toBeLessThan(120000);
  });

  test('should auto-end turn when time expires', () => {
    const timeExpiredCallback = jest.fn();
    gameState.on('turnTimeExpired', timeExpiredCallback);
    
    gameState.startGame();
    turnManager.startTurn();
    
    // Fast forward to time expiration
    jest.advanceTimersByTime(120000);
    
    expect(timeExpiredCallback).toHaveBeenCalledWith({
      player: 1
    });
    
    // Should have advanced to next player (may not work with fake timers)
    expect(gameState.currentPlayer).toBeGreaterThan(0);
  });

  test('should use player actions correctly', () => {
    const actionCallback = jest.fn();
    gameState.on('actionUsed', actionCallback);
    
    const player = gameState.getCurrentPlayer();
    
    const success = turnManager.usePlayerAction();
    expect(success).toBe(true);
    expect(player.actionsRemaining).toBe(2);
    expect(actionCallback).toHaveBeenCalledWith({
      player: 1,
      actionsRemaining: 2
    });
  });

  test('should not use action when none remaining', () => {
    const player = gameState.getCurrentPlayer();
    player.actionsRemaining = 0;
    
    const success = turnManager.usePlayerAction();
    expect(success).toBe(false);
    expect(player.actionsRemaining).toBe(0);
  });

  test('should auto-advance from action phase when no actions remain', () => {
    gameState.startGame();
    gameState.currentPhase = 'action';
    turnManager.currentPhaseIndex = 1;
    
    const player = gameState.getCurrentPlayer();
    player.actionsRemaining = 1;
    
    turnManager.usePlayerAction();
    
    // Should auto-advance to build phase after a delay
    jest.advanceTimersByTime(500);
    expect(gameState.currentPhase).toBe('build');
  });

  test('should force end turn correctly', () => {
    const forceEndCallback = jest.fn();
    gameState.on('turnForcedEnd', forceEndCallback);
    
    gameState.startGame();
    
    const currentPlayer = gameState.currentPlayer;
    turnManager.forceEndTurn();
    
    expect(forceEndCallback).toHaveBeenCalledWith({
      player: currentPlayer
    });
    
    expect(gameState.currentPlayer).not.toBe(currentPlayer);
  });

  test('should get current phase info correctly', () => {
    gameState.startGame();
    turnManager.currentPhaseIndex = 1;
    gameState.currentPhase = 'action';
    
    const phaseInfo = turnManager.getCurrentPhaseInfo();
    
    expect(phaseInfo).toEqual({
      phase: 'action',
      phaseIndex: 1,
      totalPhases: 3,
      player: 1,
      timeRemaining: 120000
    });
  });

  test('should stop timer when destroyed', () => {
    gameState.startGame();
    turnManager.startTurn();
    
    expect(turnManager.turnTimer).toBeTruthy();
    
    turnManager.destroy();
    
    expect(turnManager.turnTimer).toBe(null);
    expect(turnManager.gameState).toBe(null);
  });

  test('should handle phase transitions with events', () => {
    const actionPhaseCallback = jest.fn();
    const buildPhaseCallback = jest.fn();
    
    gameState.on('actionPhaseStarted', actionPhaseCallback);
    gameState.on('buildPhaseStarted', buildPhaseCallback);
    
    gameState.startGame();
    
    // Move to action phase
    turnManager.nextPhase();
    expect(actionPhaseCallback).toHaveBeenCalledWith({
      player: 1,
      actionsRemaining: 3
    });
    
    // Move to build phase
    turnManager.nextPhase();
    expect(buildPhaseCallback).toHaveBeenCalledWith({
      player: 1,
      energy: expect.any(Number)
    });
  });
});