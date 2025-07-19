// Game Configuration Constants
export const GAME_CONFIG = {
    GRID_SIZE: 8,
    CELL_SIZE: 75,
    MAX_PLAYERS: 2,
    INITIAL_ENERGY: 100
};

// Unit Types
export const UNIT_TYPES = {
    WORKER: {
        id: 'worker',
        name: 'Worker',
        cost: 10,
        health: 50,
        attack: 5,
        movement: 2,
        abilities: ['build', 'gather']
    },
    SCOUT: {
        id: 'scout',
        name: 'Scout',
        cost: 15,
        health: 30,
        attack: 10,
        movement: 4,
        abilities: ['scout', 'fast_move']
    },
    INFANTRY: {
        id: 'infantry',
        name: 'Infantry',
        cost: 25,
        health: 100,
        attack: 20,
        movement: 2,
        abilities: ['attack', 'defend']
    },
    HEAVY: {
        id: 'heavy',
        name: 'Heavy',
        cost: 50,
        health: 200,
        attack: 40,
        movement: 1,
        abilities: ['heavy_attack', 'siege']
    }
};

// Game States
export const GAME_STATES = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ENDED: 'ended'
};

// Player Colors
export const PLAYER_COLORS = {
    1: '#3498db',  // Blue
    2: '#e74c3c'   // Red
};

// UI Constants
export const UI_COLORS = {
    GRID_LINE: '#95a5a6',
    GRID_BG: '#ffffff',
    SELECTION: 'rgba(52, 152, 219, 0.3)',
    SELECTION_BORDER: '#3498db'
};

// Action Types
export const ACTION_TYPES = {
    MOVE: 'move',
    ATTACK: 'attack',
    BUILD: 'build',
    GATHER: 'gather'
};

// Turn Configuration
export const TURN_CONFIG = {
    MAX_ACTIONS: 3,
    TIME_LIMIT: 120000, // 2 minutes in milliseconds
    AUTO_END_TURN: true
};