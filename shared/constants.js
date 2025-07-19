// Game Configuration Constants
export const GAME_CONFIG = {
    GRID_SIZE: 25,
    CELL_SIZE: 32,
    MAX_PLAYERS: 2,
    STARTING_ENERGY: 100
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
    1: '#4169e1',  // Blue
    2: '#dc143c'   // Red
};

// Unit Unicode Characters
export const UNIT_CHARACTERS = {
    worker: '♦',    // Diamond
    scout: '♙',     // Pawn
    infantry: '♗',  // Bishop
    heavy: '♖'      // Rook
};

// UI Constants
export const UI_COLORS = {
    GRID_LINE: '#95a5a6',
    GRID_BG: '#ffffff',
    GRID_LIGHT: '#f8f9fa',
    GRID_DARK: '#e9ecef',
    SELECTION: 'rgba(52, 152, 219, 0.3)',
    SELECTION_BORDER: '#3498db',
    HOVER: 'rgba(52, 152, 219, 0.1)',
    RESOURCE_NODE: '#32cd32'
};

// Movement Colors
export const MOVEMENT_COLORS = {
    VALID_MOVE: 'rgba(0, 255, 0, 0.3)',
    VALID_MOVE_BORDER: '#00aa00',
    PATH_PREVIEW: 'rgba(255, 255, 0, 0.4)',
    PATH_PREVIEW_BORDER: '#ffaa00',
    MOVEMENT_COST: '#666666'
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

// Resource Node Configuration
export const RESOURCE_CONFIG = {
    INITIAL_VALUE: 100,
    NODE_COUNT: 9,
    // Symmetric positions for 9 resource nodes on 25x25 grid
    NODE_POSITIONS: [
        { x: 4, y: 4 },   // Top-left quadrant
        { x: 12, y: 4 },  // Top-center
        { x: 20, y: 4 },  // Top-right quadrant
        { x: 4, y: 12 },  // Middle-left
        { x: 12, y: 12 }, // Center
        { x: 20, y: 12 }, // Middle-right
        { x: 4, y: 20 },  // Bottom-left quadrant
        { x: 12, y: 20 }, // Bottom-center
        { x: 20, y: 20 }  // Bottom-right quadrant
    ]
};