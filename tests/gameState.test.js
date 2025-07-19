/**
 * Unit tests for GameState management
 */

import { GameState, Player, Unit } from '../public/gameState.js';

describe('Player', () => {
  let player;

  beforeEach(() => {
    player = new Player(1, 'Test Player');
  });

  test('should initialize with correct default values', () => {
    expect(player.id).toBe(1);
    expect(player.name).toBe('Test Player');
    expect(player.energy).toBe(100);
    expect(player.resourcesGathered).toBe(0);
    expect(player.actionsRemaining).toBe(3);
    expect(player.isActive).toBe(false);
  });

  test('should add energy correctly', () => {
    player.addEnergy(50);
    expect(player.energy).toBe(150);
  });

  test('should spend energy when sufficient funds available', () => {
    const result = player.spendEnergy(30);
    expect(result).toBe(true);
    expect(player.energy).toBe(70);
  });

  test('should not spend energy when insufficient funds', () => {
    const result = player.spendEnergy(150);
    expect(result).toBe(false);
    expect(player.energy).toBe(100);
  });

  test('should manage unit ownership correctly', () => {
    player.addUnit('unit1');
    player.addUnit('unit2');
    expect(player.unitsOwned.has('unit1')).toBe(true);
    expect(player.unitsOwned.has('unit2')).toBe(true);
    expect(player.unitsOwned.size).toBe(2);

    player.removeUnit('unit1');
    expect(player.unitsOwned.has('unit1')).toBe(false);
    expect(player.unitsOwned.size).toBe(1);
  });

  test('should serialize and deserialize correctly', () => {
    player.addEnergy(25);
    player.addUnit('unit1');
    player.actionsRemaining = 2;

    const serialized = player.serialize();
    const deserialized = Player.deserialize(serialized);

    expect(deserialized.id).toBe(player.id);
    expect(deserialized.energy).toBe(player.energy);
    expect(deserialized.unitsOwned.size).toBe(player.unitsOwned.size);
    expect(deserialized.actionsRemaining).toBe(player.actionsRemaining);
  });
});

describe('Unit', () => {
  let unit;

  beforeEach(() => {
    unit = new Unit('worker', 1, 5, 5);
  });

  test('should initialize with correct values', () => {
    expect(unit.type).toBe('worker');
    expect(unit.playerId).toBe(1);
    expect(unit.position.x).toBe(5);
    expect(unit.position.y).toBe(5);
    expect(unit.health).toBe(50); // worker health from constants
    expect(unit.maxHealth).toBe(50);
    expect(unit.actionsUsed).toBe(0);
  });

  test('should move to new position', () => {
    unit.moveTo(10, 15);
    expect(unit.position.x).toBe(10);
    expect(unit.position.y).toBe(15);
  });

  test('should take damage correctly', () => {
    const destroyed = unit.takeDamage(30);
    expect(unit.health).toBe(20);
    expect(destroyed).toBe(false);

    const destroyed2 = unit.takeDamage(25);
    expect(unit.health).toBe(0);
    expect(destroyed2).toBe(true);
  });

  test('should heal correctly without exceeding max health', () => {
    unit.takeDamage(30); // health = 20
    unit.heal(15);
    expect(unit.health).toBe(35);

    unit.heal(50); // should cap at max health
    expect(unit.health).toBe(50);
  });

  test('should manage actions correctly', () => {
    expect(unit.canAct()).toBe(true);
    
    unit.useAction();
    expect(unit.actionsUsed).toBe(1);
    expect(unit.canAct()).toBe(true);

    unit.useAction();
    expect(unit.actionsUsed).toBe(2);
    expect(unit.canAct()).toBe(false);

    unit.resetActions();
    expect(unit.actionsUsed).toBe(0);
    expect(unit.canAct()).toBe(true);
  });

  test('should serialize and deserialize correctly', () => {
    unit.moveTo(12, 8);
    unit.takeDamage(10);
    unit.useAction();

    const serialized = unit.serialize();
    const deserialized = Unit.deserialize(serialized);

    expect(deserialized.id).toBe(unit.id);
    expect(deserialized.type).toBe(unit.type);
    expect(deserialized.position.x).toBe(unit.position.x);
    expect(deserialized.position.y).toBe(unit.position.y);
    expect(deserialized.health).toBe(unit.health);
    expect(deserialized.actionsUsed).toBe(unit.actionsUsed);
  });
});

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  test('should initialize with correct default values', () => {
    expect(gameState.status).toBe('ready');
    expect(gameState.currentPlayer).toBe(1);
    expect(gameState.currentPhase).toBe('resource');
    expect(gameState.turnNumber).toBe(1);
    expect(gameState.players.size).toBe(2);
    expect(gameState.units.size).toBe(0);
  });

  test('should have proper board dimensions', () => {
    expect(gameState.board.length).toBe(25);
    expect(gameState.board[0].length).toBe(25);
    expect(gameState.board[12][12]).toBe(null);
  });

  test('should validate positions correctly', () => {
    expect(gameState.isValidPosition(0, 0)).toBe(true);
    expect(gameState.isValidPosition(24, 24)).toBe(true);
    expect(gameState.isValidPosition(-1, 0)).toBe(false);
    expect(gameState.isValidPosition(25, 0)).toBe(false);
    expect(gameState.isValidPosition(0, -1)).toBe(false);
    expect(gameState.isValidPosition(0, 25)).toBe(false);
  });

  test('should check position emptiness correctly', () => {
    expect(gameState.isPositionEmpty(5, 5)).toBe(true);
    
    // Create a unit and check position is no longer empty
    const unit = gameState.createUnit('worker', 1, 5, 5);
    expect(gameState.isPositionEmpty(5, 5)).toBe(false);
    expect(gameState.getUnitAt(5, 5)).toBe(unit);
  });

  test('should create units correctly', () => {
    const unit = gameState.createUnit('worker', 1, 10, 10);
    
    expect(unit).toBeTruthy();
    expect(unit.type).toBe('worker');
    expect(unit.playerId).toBe(1);
    expect(unit.position.x).toBe(10);
    expect(unit.position.y).toBe(10);
    
    expect(gameState.units.has(unit.id)).toBe(true);
    expect(gameState.board[10][10]).toBe(unit.id);
    
    const player = gameState.players.get(1);
    expect(player.unitsOwned.has(unit.id)).toBe(true);
    expect(player.energy).toBe(90); // 100 - 10 (worker cost)
  });

  test('should not create unit on occupied position', () => {
    gameState.createUnit('worker', 1, 5, 5);
    const unit2 = gameState.createUnit('scout', 2, 5, 5);
    
    expect(unit2).toBe(null);
    expect(gameState.units.size).toBe(1);
  });

  test('should not create unit with insufficient energy', () => {
    const player = gameState.players.get(1);
    player.energy = 5; // Not enough for worker (cost: 10)
    
    const unit = gameState.createUnit('worker', 1, 5, 5);
    expect(unit).toBe(null);
    expect(gameState.units.size).toBe(0);
  });

  test('should move units correctly', () => {
    const unit = gameState.createUnit('worker', 1, 5, 5);
    const moved = gameState.moveUnit(unit.id, 6, 5);
    
    expect(moved).toBe(true);
    expect(unit.position.x).toBe(6);
    expect(unit.position.y).toBe(5);
    expect(gameState.board[5][5]).toBe(null);
    expect(gameState.board[6][5]).toBe(unit.id);
    expect(unit.actionsUsed).toBe(1);
  });

  test('should not move unit to occupied position', () => {
    const unit1 = gameState.createUnit('worker', 1, 5, 5);
    const unit2 = gameState.createUnit('scout', 1, 6, 5);
    
    const moved = gameState.moveUnit(unit1.id, 6, 5);
    expect(moved).toBe(false);
    expect(unit1.position.x).toBe(5); // Should stay in original position
  });

  test('should remove units correctly', () => {
    const unit = gameState.createUnit('worker', 1, 5, 5);
    const removed = gameState.removeUnit(unit.id);
    
    expect(removed).toBe(true);
    expect(gameState.units.has(unit.id)).toBe(false);
    expect(gameState.board[5][5]).toBe(null);
    
    const player = gameState.players.get(1);
    expect(player.unitsOwned.has(unit.id)).toBe(false);
  });

  test('should get player units correctly', () => {
    gameState.createUnit('worker', 1, 5, 5);
    gameState.createUnit('scout', 1, 6, 5);
    gameState.createUnit('worker', 2, 10, 10);
    
    const player1Units = gameState.getPlayerUnits(1);
    const player2Units = gameState.getPlayerUnits(2);
    
    expect(player1Units.length).toBe(2);
    expect(player2Units.length).toBe(1);
    expect(player1Units.every(unit => unit.playerId === 1)).toBe(true);
    expect(player2Units.every(unit => unit.playerId === 2)).toBe(true);
  });

  test('should handle event system correctly', () => {
    const mockCallback = jest.fn();
    gameState.on('testEvent', mockCallback);
    
    gameState.emit('testEvent', { data: 'test' });
    expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
    
    gameState.off('testEvent', mockCallback);
    gameState.emit('testEvent', { data: 'test2' });
    expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
  });

  test('should serialize and deserialize complete game state', () => {
    // Set up a complex game state
    gameState.startGame();
    gameState.createUnit('worker', 1, 5, 5);
    gameState.createUnit('scout', 2, 10, 10);
    gameState.currentPlayer = 2;
    gameState.turnNumber = 3;
    
    const serialized = gameState.serialize();
    const deserialized = GameState.deserialize(serialized);
    
    expect(deserialized.gameId).toBe(gameState.gameId);
    expect(deserialized.status).toBe(gameState.status);
    expect(deserialized.currentPlayer).toBe(gameState.currentPlayer);
    expect(deserialized.turnNumber).toBe(gameState.turnNumber);
    expect(deserialized.units.size).toBe(gameState.units.size);
    expect(deserialized.players.size).toBe(gameState.players.size);
    
    // Check specific unit data
    const originalUnits = Array.from(gameState.units.values());
    const deserializedUnits = Array.from(deserialized.units.values());
    expect(deserializedUnits.length).toBe(originalUnits.length);
    
    // Verify board state
    expect(deserialized.board[5][5]).toBeTruthy();
    expect(deserialized.board[10][10]).toBeTruthy();
  });
});