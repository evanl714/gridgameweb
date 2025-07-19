class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 8;
        this.cellSize = 75;
        this.currentPlayer = 1;
        this.gameState = 'ready';
        this.selectedCell = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateCanvasSize();
        this.render();
        console.log('Grid Strategy Game initialized');
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
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
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            this.selectCell(gridX, gridY);
        }
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
        this.drawSelection();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#95a5a6';
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
        
        // Add checkerboard pattern
        this.ctx.fillStyle = '#f8f9fa';
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                if ((x + y) % 2 === 1) {
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
    }
    
    drawSelection() {
        if (this.selectedCell) {
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
            this.ctx.fillRect(
                this.selectedCell.x * this.cellSize,
                this.selectedCell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
            
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                this.selectedCell.x * this.cellSize,
                this.selectedCell.y * this.cellSize,
                this.cellSize,
                this.cellSize
            );
        }
    }
    
    newGame() {
        this.currentPlayer = 1;
        this.gameState = 'playing';
        this.selectedCell = null;
        this.render();
        this.updatePlayerDisplay();
        this.updateStatus('New game started');
        console.log('New game started');
    }
    
    reset() {
        this.currentPlayer = 1;
        this.gameState = 'ready';
        this.selectedCell = null;
        this.render();
        this.updatePlayerDisplay();
        this.updateStatus('Game reset');
        console.log('Game reset');
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