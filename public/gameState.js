/**
 * Core Game State Management System
 * Handles all game state, players, units, and turn management
 */

import { GAME_CONFIG, UNIT_TYPES, TURN_CONFIG, GAME_STATES } from '../shared/constants.js';

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
 * Main game state management class
 */
export class GameState {
    constructor() {
        this.gameId = generateId();
        this.status = GAME_STATES.READY;
        this.currentPlayer = 1;
        this.currentPhase = 'resource'; // resource, action, build
        this.turnNumber = 1;
        this.players = new Map();
        this.units = new Map();
        this.board = this.initializeBoard();
        this.eventListeners = new Map();
        this.actionHistory = [];
        this.winner = null;
        
        // Initialize players
        this.initializePlayers();
    }

    /**
     * Initialize game board - 2D array tracking unit occupancy
     */
    initializeBoard() {
        const board = [];
        for (let x = 0; x < GAME_CONFIG.GRID_SIZE; x++) {
            board[x] = [];
            for (let y = 0; y < GAME_CONFIG.GRID_SIZE; y++) {
                board[x][y] = null; // null means empty, otherwise contains unit ID
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
     * Check if position is within board bounds
     */
    isValidPosition(x, y) {
        return x >= 0 && x < GAME_CONFIG.GRID_SIZE && y >= 0 && y < GAME_CONFIG.GRID_SIZE;
    }

    /**
     * Create a new unit
     */
    createUnit(type, playerId, x, y) {
        if (!this.isPositionEmpty(x, y)) {
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
        return true;
    }

    /**
     * Get all units for a player
     */
    getPlayerUnits(playerId) {
        return Array.from(this.units.values()).filter(unit => unit.playerId === playerId);
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