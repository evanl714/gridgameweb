// Import constants and state management from shared modules
import { 
    GAME_CONFIG, 
    UI_COLORS, 
    RESOURCE_CONFIG, 
    GAME_STATES,
    PLAYER_COLORS,
    UNIT_TYPES 
} from '../shared/constants.js';

import { GameState } from './gameState.js';
import { TurnManager } from './turnManager.js';
import { ResourceManager } from './resourceManager.js';
import { PersistenceManager } from './persistence.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = GAME_CONFIG.GRID_SIZE; // 25x25
        this.cellSize = GAME_CONFIG.CELL_SIZE; // 32 pixels per cell
        
        // UI state
        this.selectedCell = null;
        this.hoveredCell = null;
        this.selectedUnit = null;
        
        // Initialize game state management
        this.gameState = new GameState();
        this.turnManager = new TurnManager(this.gameState);
        this.resourceManager = new ResourceManager(this.gameState);
        this.persistenceManager = new PersistenceManager();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupGameEventListeners();
        this.updateCanvasSize();
        this.render();
        this.updateUI();
        console.log('Grid Strategy Game initialized with state management');
    }

    setupGameEventListeners() {
        // Listen to game state events
        this.gameState.on('gameStarted', () => {
            this.updateUI();
            console.log('Game started');
        });

        this.gameState.on('turnStarted', (data) => {
            this.updateUI();
            console.log(`Turn ${data.turnNumber} started for Player ${data.player}`);
        });

        this.gameState.on('phaseChanged', (data) => {
            this.updateUI();
            console.log(`Phase changed to ${data.phase} for Player ${data.player}`);
        });

        this.gameState.on('unitCreated', (data) => {
            this.render();
            console.log(`Unit created: ${data.unit.type} at (${data.unit.position.x}, ${data.unit.position.y})`);
        });

        this.gameState.on('unitMoved', (data) => {
            this.render();
            console.log(`Unit moved from (${data.from.x}, ${data.from.y}) to (${data.to.x}, ${data.to.y})`);
        });

        this.gameState.on('resourcesGathered', (data) => {
            this.render();
            this.updateUI();
            console.log(`Player ${data.playerId} gathered ${data.amount} resources`);
        });
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
        // Add additional controls
        const endTurnBtn = document.getElementById('endTurnBtn');
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => this.endTurn());
        }

        const nextPhaseBtn = document.getElementById('nextPhaseBtn');
        if (nextPhaseBtn) {
            nextPhaseBtn.addEventListener('click', () => this.nextPhase());
        }

        const gatherBtn = document.getElementById('gatherBtn');
        if (gatherBtn) {
            gatherBtn.addEventListener('click', () => this.gatherResources());
        }

        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveGame());
        }

        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadGame());
        }
        
        window.addEventListener('resize', () => this.updateCanvasSize());
    }
    
    updateCanvasSize() {
        const totalSize = this.gridSize * this.cellSize;
        this.canvas.width = totalSize;
        this.canvas.height = totalSize;
    }
    
    handleClick(event) {
        const coords = this.getGridCoordinates(event);
        if (coords) {
            this.handleCellClick(coords.x, coords.y);
        }
    }

    handleCellClick(x, y) {
        const unit = this.gameState.getUnitAt(x, y);
        
        if (this.selectedUnit) {
            // Try to move selected unit
            if (this.selectedUnit.playerId === this.gameState.currentPlayer) {
                const moved = this.gameState.moveUnit(this.selectedUnit.id, x, y);
                if (moved) {
                    this.turnManager.usePlayerAction();
                    this.selectedUnit = null;
                    this.selectedCell = null;
                } else if (unit && unit.playerId === this.gameState.currentPlayer) {
                    // Select different unit
                    this.selectedUnit = unit;
                    this.selectedCell = { x, y };
                }
            }
        } else if (unit && unit.playerId === this.gameState.currentPlayer) {
            // Select unit
            this.selectedUnit = unit;
            this.selectedCell = { x, y };
        } else {
            // Try to create unit (if in build phase)
            if (this.gameState.currentPhase === 'build' && this.gameState.isPositionEmpty(x, y)) {
                this.showUnitCreationDialog(x, y);
            } else {
                this.selectedCell = { x, y };
                this.selectedUnit = null;
            }
        }
        
        this.render();
        this.updateUI();
        this.updateStatus(`Selected cell: (${x}, ${y})`);
    }

    showUnitCreationDialog(x, y) {
        const player = this.gameState.getCurrentPlayer();
        const unitTypes = ['worker', 'scout', 'infantry', 'heavy'];
        
        // Simple dialog for unit creation
        const unitType = prompt('Create unit type (worker/scout/infantry/heavy):');
        if (unitType && unitTypes.includes(unitType.toLowerCase())) {
            const unit = this.gameState.createUnit(unitType.toLowerCase(), player.id, x, y);
            if (!unit) {
                alert('Cannot create unit - insufficient energy or invalid position');
            }
        }
    }
    
    handleMouseMove(event) {
        const coords = this.getGridCoordinates(event);
        if (coords) {
            if (!this.hoveredCell || this.hoveredCell.x !== coords.x || this.hoveredCell.y !== coords.y) {
                this.hoveredCell = coords;
                this.render();
            }
        }
    }
    
    handleMouseLeave() {
        if (this.hoveredCell) {
            this.hoveredCell = null;
            this.render();
        }
    }
    
    getGridCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Account for canvas scaling
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const adjustedX = x * scaleX;
        const adjustedY = y * scaleY;
        
        const gridX = Math.floor(adjustedX / this.cellSize);
        const gridY = Math.floor(adjustedY / this.cellSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            return { x: gridX, y: gridY };
        }
        return null;
    }
    
    selectCell(x, y) {
        this.selectedCell = { x, y };
        this.render();
        this.updateStatus(`Selected cell: (${x}, ${y})`);
        console.log(`Cell selected: (${x}, ${y})`);
    }
    
    render() {
        this.clearCanvas();
        this.drawGrid();
        this.drawHover();
        this.drawSelection();
        this.drawResourceNodes();
        this.drawUnits();
        this.drawUnitSelection();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        // Draw alternating chess-like pattern first
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                // Determine if this square should be light or dark
                const isLight = (x + y) % 2 === 0;
                this.ctx.fillStyle = isLight ? UI_COLORS.GRID_LIGHT : UI_COLORS.GRID_DARK;
                
                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize
                );
            }
        }
        
        // Draw grid lines for clarity
        this.ctx.strokeStyle = UI_COLORS.GRID_LINE;
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let i = 0; i <= this.gridSize; i++) {
            const x = i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let i = 0; i <= this.gridSize; i++) {
            const y = i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawHover() {
        if (this.hoveredCell) {
            this.ctx.fillStyle = UI_COLORS.HOVER;
            this.ctx.fillRect(
                this.hoveredCell.x * this.cellSize,
                this.hoveredCell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }
    
    drawSelection() {
        if (this.selectedCell) {
            this.ctx.fillStyle = UI_COLORS.SELECTION;
            this.ctx.fillRect(
                this.selectedCell.x * this.cellSize,
                this.selectedCell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
            
            this.ctx.strokeStyle = UI_COLORS.SELECTION_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                this.selectedCell.x * this.cellSize,
                this.selectedCell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }
    
    drawResourceNodes() {
        const resourceInfo = this.resourceManager.getResourceNodeInfo();
        resourceInfo.forEach(nodeInfo => {
            const node = nodeInfo.position;
            // Draw resource node as a filled circle
            const centerX = node.x * this.cellSize + this.cellSize / 2;
            const centerY = node.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.3;
            
            // Color based on resource availability
            const efficiency = nodeInfo.efficiency;
            const alpha = 0.3 + (efficiency * 0.7); // More transparent when depleted
            this.ctx.fillStyle = `rgba(50, 205, 50, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add darker border
            this.ctx.strokeStyle = '#228B22';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw resource value text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                nodeInfo.value.toString(),
                centerX,
                centerY
            );
        });
    }

    drawUnits() {
        Array.from(this.gameState.units.values()).forEach(unit => {
            const centerX = unit.position.x * this.cellSize + this.cellSize / 2;
            const centerY = unit.position.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.25;
            
            // Get player color
            const color = PLAYER_COLORS[unit.playerId] || '#666666';
            
            // Draw unit circle
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw unit type indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const typeIndicator = {
                'worker': 'W',
                'scout': 'S',
                'infantry': 'I',
                'heavy': 'H'
            }[unit.type] || '?';
            
            this.ctx.fillText(typeIndicator, centerX, centerY);
            
            // Draw health bar
            this.drawUnitHealthBar(unit, centerX, centerY - radius - 5);
            
            // Draw action indicator
            if (unit.actionsUsed >= unit.maxActions) {
                this.drawActionIndicator(centerX + radius, centerY - radius, 'exhausted');
            } else if (unit.actionsUsed > 0) {
                this.drawActionIndicator(centerX + radius, centerY - radius, 'partial');
            }
        });
    }

    drawUnitHealthBar(unit, centerX, y) {
        const barWidth = this.cellSize * 0.6;
        const barHeight = 4;
        const healthPercent = unit.health / unit.maxHealth;
        
        // Background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(centerX - barWidth/2, y, barWidth, barHeight);
        
        // Health bar
        const healthColor = healthPercent > 0.6 ? '#4CAF50' : 
                           healthPercent > 0.3 ? '#FF9800' : '#F44336';
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(centerX - barWidth/2, y, barWidth * healthPercent, barHeight);
    }

    drawActionIndicator(x, y, status) {
        const size = 6;
        const color = status === 'exhausted' ? '#F44336' : '#FF9800';
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size/2, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawUnitSelection() {
        if (this.selectedUnit) {
            const centerX = this.selectedUnit.position.x * this.cellSize + this.cellSize / 2;
            const centerY = this.selectedUnit.position.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.4;
            
            // Draw selection ring
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }
    
    newGame() {
        // Reset state management
        this.gameState = new GameState();
        this.turnManager = new TurnManager(this.gameState);
        this.resourceManager = new ResourceManager(this.gameState);
        
        // Reset UI state
        this.selectedCell = null;
        this.hoveredCell = null;
        this.selectedUnit = null;
        
        // Setup event listeners for new game state
        this.setupGameEventListeners();
        
        // Start the game
        this.gameState.startGame();
        
        this.render();
        this.updateUI();
        this.updateStatus('New game started');
        console.log('New game started with state management');
    }
    
    reset() {
        this.newGame();
        this.updateStatus('Game reset');
        console.log('Game reset');
    }
    
    updateUI() {
        this.updatePlayerDisplay();
        this.updateGameInfo();
    }

    updatePlayerDisplay() {
        const playerElement = document.getElementById('currentPlayer');
        if (playerElement) {
            const currentPlayer = this.gameState.getCurrentPlayer();
            playerElement.textContent = `Player ${currentPlayer.id}'s Turn`;
        }
    }

    updateGameInfo() {
        // Update phase display
        const phaseElement = document.getElementById('gamePhase');
        if (phaseElement) {
            phaseElement.textContent = `Phase: ${this.gameState.currentPhase}`;
        }

        // Update player info
        const player = this.gameState.getCurrentPlayer();
        const energyElement = document.getElementById('playerEnergy');
        if (energyElement) {
            energyElement.textContent = `Energy: ${player.energy}`;
        }

        const actionsElement = document.getElementById('playerActions');
        if (actionsElement) {
            actionsElement.textContent = `Actions: ${player.actionsRemaining}`;
        }

        const unitsElement = document.getElementById('playerUnits');
        if (unitsElement) {
            unitsElement.textContent = `Units: ${player.unitsOwned.size}`;
        }

        // Update turn info
        const turnElement = document.getElementById('turnNumber');
        if (turnElement) {
            turnElement.textContent = `Turn: ${this.gameState.turnNumber}`;
        }

        // Update selected unit info
        const selectedUnitElement = document.getElementById('selectedUnit');
        if (selectedUnitElement) {
            if (this.selectedUnit) {
                const stats = this.selectedUnit.getStats();
                selectedUnitElement.innerHTML = `
                    <strong>${stats.name}</strong><br>
                    Health: ${this.selectedUnit.health}/${this.selectedUnit.maxHealth}<br>
                    Actions: ${this.selectedUnit.actionsUsed}/${this.selectedUnit.maxActions}
                `;
            } else {
                selectedUnitElement.innerHTML = 'No unit selected';
            }
        }
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    endTurn() {
        this.turnManager.forceEndTurn();
        this.selectedUnit = null;
        this.selectedCell = null;
        this.updateUI();
    }

    nextPhase() {
        this.turnManager.nextPhase();
        this.updateUI();
    }

    gatherResources() {
        if (this.selectedUnit && this.selectedUnit.type === 'worker') {
            const result = this.resourceManager.gatherResources(this.selectedUnit.id);
            if (result.success) {
                this.updateStatus(`Gathered ${result.amount} resources`);
            } else {
                this.updateStatus(`Cannot gather: ${result.reason}`);
            }
            this.updateUI();
        } else {
            this.updateStatus('Select a worker unit to gather resources');
        }
    }

    saveGame() {
        const result = this.persistenceManager.saveGame(this.gameState, this.resourceManager);
        if (result.success) {
            this.updateStatus('Game saved successfully');
        } else {
            this.updateStatus(`Save failed: ${result.error}`);
        }
    }

    loadGame() {
        const result = this.persistenceManager.loadGame();
        if (result.success) {
            this.gameState = result.gameState;
            this.turnManager = new TurnManager(this.gameState);
            this.resourceManager = result.resourceManager;
            
            this.setupGameEventListeners();
            this.render();
            this.updateUI();
            this.updateStatus('Game loaded successfully');
        } else {
            this.updateStatus(`Load failed: ${result.error}`);
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});