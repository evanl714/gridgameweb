// Game Configuration Constants
export const GAME_CONFIG = {
  GRID_SIZE: 25,
  CELL_SIZE: 32,
  MAX_PLAYERS: 2,
  STARTING_ENERGY: 100,
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
    abilities: ['build', 'gather'],
  },
  SCOUT: {
    id: 'scout',
    name: 'Scout',
    cost: 15,
    health: 30,
    attack: 10,
    movement: 4,
    abilities: ['scout', 'fast_move'],
  },
  INFANTRY: {
    id: 'infantry',
    name: 'Infantry',
    cost: 25,
    health: 100,
    attack: 20,
    movement: 2,
    abilities: ['attack', 'defend'],
  },
  HEAVY: {
    id: 'heavy',
    name: 'Heavy',
    cost: 50,
    health: 200,
    attack: 40,
    movement: 1,
    abilities: ['heavy_attack', 'siege'],
  },
};

// Game States
export const GAME_STATES = {
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
};

// Player Colors - Updated for Chess.com + StarCraft 2 Theme
export const PLAYER_COLORS = {
  1: '#00aaff', // StarCraft 2 Blue
  2: '#F44336', // Strategic Red
};

// Entity Unicode Characters
export const ENTITY_CHARACTERS = {
  worker: '♦', // Diamond
  scout: '♙', // Pawn
  infantry: '♗', // Bishop
  heavy: '♖', // Rook
  base: '⬛', // Black square (base)
};

// Backward compatibility
export const UNIT_CHARACTERS = ENTITY_CHARACTERS;

// UI Constants - StarCraft 2 Aesthetic
export const UI_COLORS = {
  GRID_LINE: '#333333',
  GRID_BG: '#1a1a1a',
  GRID_LIGHT: '#2a2a2a',
  GRID_DARK: '#1f1f1f',
  SELECTION: 'rgba(0, 170, 255, 0.3)',
  SELECTION_BORDER: '#00aaff',
  HOVER: 'rgba(0, 170, 255, 0.1)',
  RESOURCE_NODE: '#7CB342',
  GRID_ACCENT: 'rgba(0, 170, 255, 0.15)',
  GRID_BORDER_GLOW: 'rgba(0, 170, 255, 0.3)',
};

// Movement Colors - Tactical Display
export const MOVEMENT_COLORS = {
  VALID_MOVE: 'rgba(123, 179, 66, 0.3)',
  VALID_MOVE_BORDER: '#7CB342',
  PATH_PREVIEW: 'rgba(0, 255, 255, 0.4)',
  PATH_PREVIEW_BORDER: '#00ffff',
  MOVEMENT_COST: '#cccccc',
  ATTACK_RANGE: 'rgba(244, 67, 54, 0.3)',
  ATTACK_RANGE_BORDER: '#F44336',
};

// Action Types
export const ACTION_TYPES = {
  MOVE: 'move',
  ATTACK: 'attack',
  BUILD: 'build',
  GATHER: 'gather',
};

// Turn Configuration
export const TURN_CONFIG = {
  MAX_ACTIONS: 3,
  TIME_LIMIT: 120000, // 2 minutes in milliseconds
  AUTO_END_TURN: true,
};

// Resource Node Configuration
export const RESOURCE_CONFIG = {
  INITIAL_VALUE: 100,
  NODE_COUNT: 9,
  // Symmetric positions for 9 resource nodes on 25x25 grid
  NODE_POSITIONS: [
    { x: 4, y: 4 }, // Top-left quadrant
    { x: 12, y: 4 }, // Top-center
    { x: 20, y: 4 }, // Top-right quadrant
    { x: 4, y: 12 }, // Middle-left
    { x: 12, y: 12 }, // Center
    { x: 20, y: 12 }, // Middle-right
    { x: 4, y: 20 }, // Bottom-left quadrant
    { x: 12, y: 20 }, // Bottom-center
    { x: 20, y: 20 }, // Bottom-right quadrant
  ],
};

// Base Configuration
export const BASE_CONFIG = {
  HEALTH: 200,
  PLACEMENT_RADIUS: 3, // Units must be placed within 3 squares of base
  MAX_PLACEMENT_RADIUS: 5, // Maximum search radius when base area is crowded
  STARTING_POSITIONS: {
    1: { x: 1, y: 23 }, // Player 1 base (bottom-left area)
    2: { x: 23, y: 1 }, // Player 2 base (top-right area)
  },
};

// Combat Configuration
export const COMBAT_CONFIG = {
  ATTACK_RANGE: 1, // Adjacent attacks only
  DAMAGE_VALUES: {
    worker: 1,   // Workers can defend themselves
    scout: 1,    // As per ISSUE-009 requirements
    infantry: 2, // As per ISSUE-009 requirements
    heavy: 3,    // As per ISSUE-009 requirements
  },
  CAN_ATTACK_BASES: true, // Units can attack enemy bases
};
