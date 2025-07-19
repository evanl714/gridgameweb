// Import constants from shared module
import { 
    GAME_CONFIG, 
    UI_COLORS, 
    RESOURCE_CONFIG, 
    GAME_STATES 
} from '../shared/constants.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = GAME_CONFIG.GRID_SIZE; // 25x25
        this.cellSize = GAME_CONFIG.CELL_SIZE; // 32 pixels per cell
        this.currentPlayer = 1;
        this.gameState = GAME_STATES.READY;
        this.selectedCell = null;
        this.hoveredCell = null;
        
        // Initialize resource nodes
        this.resourceNodes = this.initializeResourceNodes();
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateCanvasSize();
        this.render();
        console.log('Grid Strategy Game initialized');
    }
    
    initializeResourceNodes() {
        return RESOURCE_CONFIG.NODE_POSITIONS.map(pos => ({
            x: pos.x,
            y: pos.y,
            value: RESOURCE_CONFIG.INITIAL_VALUE
        }));
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        
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
            this.selectCell(coords.x, coords.y);
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
        this.resourceNodes.forEach(node => {
            // Draw resource node as a filled circle
            const centerX = node.x * this.cellSize + this.cellSize / 2;
            const centerY = node.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.3;
            
            this.ctx.fillStyle = UI_COLORS.RESOURCE_NODE;
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
                node.value.toString(),
                centerX,
                centerY
            );
        });
    }
    
    newGame() {
        this.currentPlayer = 1;
        this.gameState = GAME_STATES.PLAYING;
        this.selectedCell = null;
        this.hoveredCell = null;
        // Reset resource nodes
        this.resourceNodes = this.initializeResourceNodes();
        this.render();
        this.updatePlayerDisplay();
        this.updateStatus('New game started');
        console.log('New game started - 25x25 grid initialized');
    }
    
    reset() {
        this.currentPlayer = 1;
        this.gameState = GAME_STATES.READY;
        this.selectedCell = null;
        this.hoveredCell = null;
        // Reset resource nodes
        this.resourceNodes = this.initializeResourceNodes();
        this.render();
        this.updatePlayerDisplay();
        this.updateStatus('Game reset');
        console.log('Game reset - 25x25 grid ready');
    }
    
    updatePlayerDisplay() {
        const playerElement = document.getElementById('currentPlayer');
        if (playerElement) {
            playerElement.textContent = `Player ${this.currentPlayer}'s Turn`;
        }
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});