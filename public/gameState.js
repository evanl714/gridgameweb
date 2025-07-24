/**
 * Core Game State Management System
 * Handles all game state, players, units, and turn management
 */

import { GAME_CONFIG, UNIT_TYPES, TURN_CONFIG, GAME_STATES, BASE_CONFIG, COMBAT_CONFIG } from '../shared/constants.js';
import { Observable } from './js/patterns/Observer.js';

// Utility function to generate unique IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Represents a player in the game
 */
export class Player {
  constructor(id, name = `Player ${id}`) {
    this.id = id;
    this.name = name;
    this.energy = GAME_CONFIG.STARTING_ENERGY;
    this.resourcesGathered = 0;
    this.unitsOwned = new Set();
    this.actionsRemaining = TURN_CONFIG.MAX_ACTIONS;
    this.isActive = false;
  }

  /**
     * Add energy to player's pool
     */
  addEnergy(amount) {
    this.energy += amount;
  }

  /**
     * Spend energy if player has enough
     */
  spendEnergy(amount) {
    if (this.energy >= amount) {
      this.energy -= amount;
      return true;
    }
    return false;
  }

  /**
     * Add a unit to player's ownership
     */
  addUnit(unitId) {
    this.unitsOwned.add(unitId);
  }

  /**
     * Remove a unit from player's ownership
     */
  removeUnit(unitId) {
    this.unitsOwned.delete(unitId);
  }

  /**
     * Reset actions for new turn
     */
  resetActions() {
    this.actionsRemaining = TURN_CONFIG.MAX_ACTIONS;
  }

  /**
     * Use an action if available
     */
  useAction() {
    if (this.actionsRemaining > 0) {
      this.actionsRemaining--;
      return true;
    }
    return false;
  }

  /**
     * Get player state for serialization
     */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      energy: this.energy,
      resourcesGathered: this.resourcesGathered,
      unitsOwned: Array.from(this.unitsOwned),
      actionsRemaining: this.actionsRemaining,
      isActive: this.isActive
    };
  }

  /**
     * Restore player from serialized data
     */
  static deserialize(data) {
    const player = new Player(data.id, data.name);
    player.energy = data.energy;
    player.resourcesGathered = data.resourcesGathered;
    player.unitsOwned = new Set(data.unitsOwned);
    player.actionsRemaining = data.actionsRemaining;
    player.isActive = data.isActive;
    return player;
  }
}

/**
 * Represents a unit in the game
 */
export class Unit {
  constructor(type, playerId, x, y) {
    this.id = generateId();
    this.type = type;
    this.playerId = playerId;
    this.position = { x, y };

    // Get unit stats based on type
    const unitStats = this.getUnitStats(type);
    this.health = unitStats.health;
    this.maxHealth = unitStats.health;
    this.actionsUsed = 0;
    this.maxActions = unitStats.movement;
    this.isSelected = false;
  }

  /**
     * Get unit stats from constants based on type
     */
  getUnitStats(type) {
    const typeKey = type.toUpperCase();
    return UNIT_TYPES[typeKey] || UNIT_TYPES.WORKER;
  }

  /**
     * Move unit to new position
     */
  moveTo(x, y) {
    this.position.x = x;
    this.position.y = y;
  }

  /**
     * Take damage and return true if unit is destroyed
     */
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  /**
     * Heal unit
     */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
     * Check if unit can perform more actions
     */
  canAct() {
    return this.actionsUsed < this.maxActions;
  }

  /**
     * Use an action
     */
  useAction() {
    if (this.canAct()) {
      this.actionsUsed++;
      return true;
    }
    return false;
  }

  /**
     * Reset actions for new turn
     */
  resetActions() {
    this.actionsUsed = 0;
  }

  /**
     * Get unit stats from constants
     */
  getStats() {
    return this.getUnitStats(this.type);
  }

  /**
     * Get unit state for serialization
     */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      playerId: this.playerId,
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      actionsUsed: this.actionsUsed,
      maxActions: this.maxActions,
      isSelected: this.isSelected
    };
  }

  /**
     * Restore unit from serialized data
     */
  static deserialize(data) {
    const unit = new Unit(data.type, data.playerId, data.position.x, data.position.y);
    unit.id = data.id;
    unit.health = data.health;
    unit.maxHealth = data.maxHealth;
    unit.actionsUsed = data.actionsUsed;
    unit.maxActions = data.maxActions;
    unit.isSelected = data.isSelected;
    return unit;
  }
}

/**
 * Represents a base in the game
 */
export class Base {
  constructor(playerId, x, y) {
    this.id = generateId();
    this.playerId = playerId;
    this.position = { x, y };
    this.health = BASE_CONFIG.HEALTH;
    this.maxHealth = BASE_CONFIG.HEALTH;
    this.isDestroyed = false;
  }

  /**
     * Take damage and return true if base is destroyed
     */
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.isDestroyed = this.health <= 0;
    return this.isDestroyed;
  }

  /**
     * Heal base
     */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.isDestroyed = false;
  }

  /**
     * Get all valid placement positions around this base
     */
  getValidPlacementPositions(gameState, radius = BASE_CONFIG.PLACEMENT_RADIUS) {
    const validPositions = [];
    const { x: baseX, y: baseY } = this.position;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = baseX + dx;
        const y = baseY + dy;
        const manhattanDistance = Math.abs(dx) + Math.abs(dy);

        // Skip the base's own position
        if (dx === 0 && dy === 0) continue;

        // Only include positions within Manhattan distance radius
        if (manhattanDistance > radius) continue;

        // Check if position is within grid bounds
        if (x >= 0 && x < GAME_CONFIG.GRID_SIZE && y >= 0 && y < GAME_CONFIG.GRID_SIZE) {
          // Check if position is empty
          if (gameState.isPositionEmpty(x, y)) {
            validPositions.push({ x, y, distance: manhattanDistance });
          }
        }
      }
    }

    // Sort by distance from base (closer positions first)
    return validPositions.sort((a, b) => a.distance - b.distance);
  }

  /**
     * Get base state for serialization
     */
  serialize() {
    return {
      id: this.id,
      playerId: this.playerId,
      position: { ...this.position },
      health: this.health,
      maxHealth: this.maxHealth,
      isDestroyed: this.isDestroyed
    };
  }

  /**
     * Restore base from serialized data
     */
  static deserialize(data) {
    const base = new Base(data.playerId, data.position.x, data.position.y);
    base.id = data.id;
    base.health = data.health;
    base.maxHealth = data.maxHealth;
    base.isDestroyed = data.isDestroyed;
    return base;
  }
}

/**
 * Main game state management class
 */
export class GameState extends Observable {
  constructor() {
    super();
    this.gameId = generateId();
    this.status = GAME_STATES.READY;
    this.currentPlayer = 1;
    this.currentPhase = 'resource'; // resource, action, build
    this.turnNumber = 1;
    this.players = new Map();
    this.units = new Map();
    this.bases = new Map();
    this.board = this.initializeBoard();
    this.eventListeners = new Map();
    this.actionHistory = [];
    this.winner = null;

    // Initialize players and bases
    this.initializePlayers();
    this.initializeBases();
  }

  /**
     * Initialize game board - 2D array tracking entity occupancy
     */
  initializeBoard() {
    const board = [];
    for (let x = 0; x < GAME_CONFIG.GRID_SIZE; x++) {
      board[x] = [];
      for (let y = 0; y < GAME_CONFIG.GRID_SIZE; y++) {
        board[x][y] = null; // null means empty, otherwise contains entity ID
      }
    }
    return board;
  }

  /**
     * Initialize default players
     */
  initializePlayers() {
    for (let i = 1; i <= GAME_CONFIG.MAX_PLAYERS; i++) {
      this.players.set(i, new Player(i));
    }
    // Set first player as active
    this.players.get(1).isActive = true;
  }

  /**
     * Initialize bases for all players
     */
  initializeBases() {
    for (let playerId = 1; playerId <= GAME_CONFIG.MAX_PLAYERS; playerId++) {
      const position = BASE_CONFIG.STARTING_POSITIONS[playerId];
      if (position) {
        const base = new Base(playerId, position.x, position.y);
        this.bases.set(base.id, base);
        this.board[position.x][position.y] = base.id;
        this.emit('baseCreated', { base: base.serialize() });
      }
    }
  }

  /**
     * Start the game
     */
  startGame() {
    this.status = GAME_STATES.PLAYING;
    this.emit('gameStarted', { gameId: this.gameId });
  }

  /**
     * End the game with a winner
     */
  endGame(winnerId = null) {
    this.status = GAME_STATES.ENDED;
    this.winner = winnerId;
    this.emit('gameEnded', { winner: winnerId });
  }

  /**
     * Get current active player
     */
  getCurrentPlayer() {
    return this.players.get(this.currentPlayer);
  }

  /**
     * Get player by ID
     */
  getPlayerById(playerId) {
    return this.players.get(playerId);
  }

  /**
     * Get all players as array
     */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
     * Get unit at position
     */
  getUnitAt(x, y) {
    if (this.isValidPosition(x, y) && this.board[x][y]) {
      return this.units.get(this.board[x][y]);
    }
    return null;
  }

  /**
     * Check if position is valid and empty
     */
  isPositionEmpty(x, y) {
    return this.isValidPosition(x, y) && this.board[x][y] === null;
  }

  /**
     * Get entity at position (unit or base)
     */
  getEntityAt(x, y) {
    if (!this.isValidPosition(x, y) || this.board[x][y] === null) {
      return null;
    }

    const entityId = this.board[x][y];

    // Check if it's a unit first
    if (this.units.has(entityId)) {
      return { type: 'unit', entity: this.units.get(entityId) };
    }

    // Check if it's a base
    if (this.bases.has(entityId)) {
      return { type: 'base', entity: this.bases.get(entityId) };
    }

    return null;
  }

  /**
     * Check if position is within board bounds
     */
  isValidPosition(x, y) {
    return x >= 0 && x < GAME_CONFIG.GRID_SIZE && y >= 0 && y < GAME_CONFIG.GRID_SIZE;
  }

  /**
     * Get base for a specific player
     */
  getPlayerBase(playerId) {
    for (const base of this.bases.values()) {
      if (base.playerId === playerId && !base.isDestroyed) {
        return base;
      }
    }
    return null;
  }

  /**
     * Get all bases
     */
  getAllBases() {
    return Array.from(this.bases.values());
  }

  /**
     * Check if position is within placement radius of player's base
     */
  isWithinBaseRadius(playerId, x, y, radius = BASE_CONFIG.PLACEMENT_RADIUS) {
    const base = this.getPlayerBase(playerId);
    if (!base) {
      return false;
    }

    const distance = this.getMovementDistance(base.position.x, base.position.y, x, y);
    return distance <= radius;
  }

  /**
     * Find best placement position near player's base
     */
  findBestPlacementNearBase(playerId) {
    const base = this.getPlayerBase(playerId);
    if (!base) {
      return null;
    }

    // Try normal radius first, then expand if needed
    let validPositions = base.getValidPlacementPositions(this, BASE_CONFIG.PLACEMENT_RADIUS);

    if (validPositions.length === 0) {
      // Try expanded radius if base area is crowded
      validPositions = base.getValidPlacementPositions(this, BASE_CONFIG.MAX_PLACEMENT_RADIUS);
    }

    return validPositions.length > 0 ? validPositions[0] : null;
  }

  /**
     * Create a new unit
     */
  createUnit(type, playerId, x, y) {
    if (!this.isPositionEmpty(x, y)) {
      return null;
    }

    // Validate that position is within base placement radius
    if (!this.isWithinBaseRadius(playerId, x, y)) {
      return null;
    }

    const player = this.players.get(playerId);
    const typeKey = type.toUpperCase();
    const unitStats = UNIT_TYPES[typeKey] || UNIT_TYPES.WORKER;

    if (!player || !player.spendEnergy(unitStats.cost)) {
      return null;
    }

    const unit = new Unit(type, playerId, x, y);
    this.units.set(unit.id, unit);
    this.board[x][y] = unit.id;
    player.addUnit(unit.id);

    this.emit('unitCreated', { unit: unit.serialize() });
    return unit;
  }

  /**
   * Build a unit (alias for createUnit with additional validation)
   */
  buildUnit(type, x, y) {
    // Validate current phase allows building
    if (this.currentPhase !== 'build') {
      console.warn('Cannot build units outside of build phase');
      return false;
    }

    // Use current player
    const unit = this.createUnit(type, this.currentPlayer, x, y);
    return unit !== null;
  }

  /**
     * Calculate Manhattan distance between two points
     */
  getMovementDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
     * Check if a unit can move to a specific position based on distance and actions
     */
  canUnitMoveTo(unitId, targetX, targetY) {
    const unit = this.units.get(unitId);
    if (!unit || !unit.canAct() || !this.isPositionEmpty(targetX, targetY)) {
      return false;
    }

    const distance = this.getMovementDistance(unit.position.x, unit.position.y, targetX, targetY);
    const remainingActions = unit.maxActions - unit.actionsUsed;

    return distance <= remainingActions;
  }

  /**
     * Get all valid movement positions for a unit
     */
  getValidMovePositions(unitId) {
    const unit = this.units.get(unitId);
    if (!unit || !unit.canAct()) {
      return [];
    }

    const validMoves = [];
    const remainingActions = unit.maxActions - unit.actionsUsed;
    const { x: startX, y: startY } = unit.position;

    // Check all positions within movement range
    for (let x = Math.max(0, startX - remainingActions); x <= Math.min(GAME_CONFIG.GRID_SIZE - 1, startX + remainingActions); x++) {
      for (let y = Math.max(0, startY - remainingActions); y <= Math.min(GAME_CONFIG.GRID_SIZE - 1, startY + remainingActions); y++) {
        // Skip current position
        if (x === startX && y === startY) continue;

        const distance = this.getMovementDistance(startX, startY, x, y);
        if (distance <= remainingActions && this.isPositionEmpty(x, y)) {
          validMoves.push({ x, y, cost: distance });
        }
      }
    }

    return validMoves;
  }

  /**
     * Calculate movement cost for a unit to reach a target position
     */
  calculateMovementCost(unitId, targetX, targetY) {
    const unit = this.units.get(unitId);
    if (!unit) return -1;

    const distance = this.getMovementDistance(unit.position.x, unit.position.y, targetX, targetY);
    const remainingActions = unit.maxActions - unit.actionsUsed;

    return distance <= remainingActions ? distance : -1;
  }

  /**
     * Move a unit to new position with distance validation
     */
  moveUnit(unitId, newX, newY) {
    const unit = this.units.get(unitId);
    if (!unit || !this.canUnitMoveTo(unitId, newX, newY)) {
      return false;
    }

    const movementCost = this.calculateMovementCost(unitId, newX, newY);
    const oldPosition = { x: unit.position.x, y: unit.position.y };

    // Clear old position
    this.board[unit.position.x][unit.position.y] = null;

    // Set new position
    unit.moveTo(newX, newY);
    this.board[newX][newY] = unitId;

    // Use actions based on movement cost
    for (let i = 0; i < movementCost; i++) {
      unit.useAction();
    }

    this.emit('unitMoved', {
      unitId,
      from: oldPosition,
      to: { x: newX, y: newY },
      cost: movementCost
    });
    return true;
  }

  /**
     * Remove a unit from the game
     */
  removeUnit(unitId) {
    const unit = this.units.get(unitId);
    if (!unit) return false;

    // Clear board position
    this.board[unit.position.x][unit.position.y] = null;

    // Remove from player
    const player = this.players.get(unit.playerId);
    player.removeUnit(unitId);

    // Remove from units
    this.units.delete(unitId);

    this.emit('unitRemoved', { unitId, playerId: unit.playerId });

    // Check victory conditions after unit removal (for elimination victories)
    this.checkVictoryCondition();

    return true;
  }

  /**
     * Get all units for a player
     */
  getPlayerUnits(playerId) {
    return Array.from(this.units.values()).filter(unit => unit.playerId === playerId);
  }

  /**
     * Check if a unit can attack a target at given position
     */
  canUnitAttack(attackerUnitId, targetX, targetY) {
    // Get attacker unit
    const attackerUnit = this.units.get(attackerUnitId);
    if (!attackerUnit) {
      return false;
    }

    // Check if attacker can act
    if (!attackerUnit.canAct()) {
      return false;
    }

    // Validate target position
    if (!this.isValidPosition(targetX, targetY)) {
      return false;
    }

    // Check attack range (adjacent only, including diagonals)
    const dx = Math.abs(attackerUnit.position.x - targetX);
    const dy = Math.abs(attackerUnit.position.y - targetY);
    if (dx > COMBAT_CONFIG.ATTACK_RANGE || dy > COMBAT_CONFIG.ATTACK_RANGE) {
      return false;
    }

    // Get target entity
    const targetEntity = this.getEntityAt(targetX, targetY);
    if (!targetEntity) {
      return false;
    }

    // Cannot attack own units/bases
    if (targetEntity.entity.playerId === attackerUnit.playerId) {
      return false;
    }

    return true;
  }

  /**
     * Execute attack from one unit to target at position
     */
  attackUnit(attackerUnitId, targetX, targetY) {
    // Validate attack
    if (!this.canUnitAttack(attackerUnitId, targetX, targetY)) {
      return false;
    }

    const attackerUnit = this.units.get(attackerUnitId);
    const targetEntity = this.getEntityAt(targetX, targetY);

    // Calculate damage based on attacker unit type
    const damage = COMBAT_CONFIG.DAMAGE_VALUES[attackerUnit.type] || 1;

    // Apply damage to target
    const isDestroyed = targetEntity.entity.takeDamage(damage);

    // Use attacker's action
    attackerUnit.useAction();

    // Emit combat event
    this.emit('unitAttacked', {
      attackerId: attackerUnitId,
      targetId: targetEntity.entity.id,
      targetType: targetEntity.type,
      damage: damage,
      targetHealth: targetEntity.entity.health,
      destroyed: isDestroyed
    });

    // Handle unit destruction
    if (isDestroyed) {
      if (targetEntity.type === 'unit') {
        this.removeUnit(targetEntity.entity.id);
      } else if (targetEntity.type === 'base') {
        this.emit('baseDestroyed', {
          baseId: targetEntity.entity.id,
          playerId: targetEntity.entity.playerId
        });
        // Check for victory condition
        this.checkVictoryCondition();
      }
    }

    return true;
  }

  /**
     * Get valid attack targets for a unit
     */
  getValidAttackTargets(unitId) {
    const unit = this.units.get(unitId);
    if (!unit || !unit.canAct()) {
      return [];
    }

    const targets = [];
    const { x, y } = unit.position;

    // Check adjacent positions (8 directions)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip current position

        const targetX = x + dx;
        const targetY = y + dy;

        if (this.canUnitAttack(unitId, targetX, targetY)) {
          const targetEntity = this.getEntityAt(targetX, targetY);
          targets.push({
            x: targetX,
            y: targetY,
            targetType: targetEntity.type,
            targetId: targetEntity.entity.id,
            damage: COMBAT_CONFIG.DAMAGE_VALUES[unit.type] || 1
          });
        }
      }
    }

    return targets;
  }

  /**
     * Check victory condition - detects base destruction and other win conditions
     */
  checkVictoryCondition() {
    // Skip victory check if game is already ended
    if (this.status === GAME_STATES.ENDED) {
      return;
    }

    // Check for base destruction victory (primary victory condition)
    const player1Base = this.getPlayerBase(1);
    const player2Base = this.getPlayerBase(2);

    // Emit victory check event for other systems to react (before ending game)
    this.emit('victoryCheck', {
      player1BaseHealth: player1Base ? player1Base.health : 0,
      player2BaseHealth: player2Base ? player2Base.health : 0,
      gameStatus: this.status,
      turnNumber: this.turnNumber
    });

    // Handle simultaneous base destruction (draw condition)
    if (!player1Base && !player2Base) {
      this.endGame(null); // null indicates a draw
      return;
    }

    // Player 2 wins if Player 1's base is destroyed
    if (!player1Base) {
      this.endGame(2);
      return;
    }

    // Player 1 wins if Player 2's base is destroyed
    if (!player2Base) {
      this.endGame(1);
      return;
    }
  }

  /**
     * Secondary victory conditions
     */

  /**
     * Player forfeits/surrenders the game
     */
  playerSurrender(playerId) {
    if (this.status === GAME_STATES.ENDED) {
      return false;
    }

    // Determine winner (the other player)
    const winnerId = playerId === 1 ? 2 : 1;

    this.emit('playerSurrendered', {
      surrenderedPlayer: playerId,
      winner: winnerId
    });

    this.endGame(winnerId);
    return true;
  }

  /**
     * Players agree to a draw
     */
  declareDraw() {
    if (this.status === GAME_STATES.ENDED) {
      return false;
    }

    this.emit('drawDeclared', {
      turnNumber: this.turnNumber
    });

    this.endGame(null); // null indicates draw
    return true;
  }

  /**
     * Check for stalemate condition (no valid moves available)
     */
  checkStalemate() {
    if (this.status === GAME_STATES.ENDED) {
      return false;
    }

    const currentPlayer = this.getCurrentPlayer();
    const playerUnits = this.getPlayerUnits(currentPlayer.id);

    // Check if current player has any valid moves
    for (const unit of playerUnits) {
      // Check for valid movement
      const validMoves = this.getValidMoves(unit.id);
      if (validMoves.length > 0) {
        return false; // Found valid moves, not stalemate
      }

      // Check for valid attacks
      const validAttacks = this.getValidAttackTargets(unit.id);
      if (validAttacks.length > 0) {
        return false; // Found valid attacks, not stalemate
      }
    }

    // No valid moves found - this is a stalemate
    this.emit('stalemateDetected', {
      player: currentPlayer.id,
      turnNumber: this.turnNumber
    });

    this.declareDraw();
    return true;
  }

  /**
     * Event system methods
     */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  /**
     * Serialize entire game state
     */
  serialize() {
    return {
      gameId: this.gameId,
      status: this.status,
      currentPlayer: this.currentPlayer,
      currentPhase: this.currentPhase,
      turnNumber: this.turnNumber,
      players: Object.fromEntries(
        Array.from(this.players.entries()).map(([id, player]) => [id, player.serialize()])
      ),
      units: Object.fromEntries(
        Array.from(this.units.entries()).map(([id, unit]) => [id, unit.serialize()])
      ),
      board: this.board.map(row => [...row]),
      actionHistory: [...this.actionHistory],
      winner: this.winner
    };
  }

  /**
     * Restore game state from serialized data
     */
  static deserialize(data) {
    const gameState = new GameState();
    gameState.gameId = data.gameId;
    gameState.status = data.status;
    gameState.currentPlayer = data.currentPlayer;
    gameState.currentPhase = data.currentPhase;
    gameState.turnNumber = data.turnNumber;
    gameState.winner = data.winner;
    gameState.actionHistory = [...data.actionHistory];
    gameState.board = data.board.map(row => [...row]);

    // Restore players
    gameState.players.clear();
    Object.entries(data.players).forEach(([id, playerData]) => {
      gameState.players.set(parseInt(id), Player.deserialize(playerData));
    });

    // Restore units
    gameState.units.clear();
    Object.entries(data.units).forEach(([id, unitData]) => {
      gameState.units.set(id, Unit.deserialize(unitData));
    });

    return gameState;
  }
}
