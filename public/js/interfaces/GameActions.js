/**
 * GameActions - Interface for game actions that InputController delegates to
 * Replaces direct window.game dependencies with proper abstraction
 */

export class GameActions {
  constructor(gameInstance) {
    this.gameInstance = gameInstance;
  }

  newGame() {
    if (this.gameInstance && typeof this.gameInstance.newGame === 'function') {
      return this.gameInstance.newGame();
    }
  }

  nextPhase() {
    if (this.gameInstance && typeof this.gameInstance.nextPhase === 'function') {
      return this.gameInstance.nextPhase();
    }
  }

  gatherResources() {
    if (this.gameInstance && typeof this.gameInstance.gatherResources === 'function') {
      return this.gameInstance.gatherResources();
    }
  }

  surrender() {
    if (this.gameInstance && typeof this.gameInstance.surrender === 'function') {
      return this.gameInstance.surrender();
    }
  }

  offerDraw() {
    if (this.gameInstance && typeof this.gameInstance.offerDraw === 'function') {
      return this.gameInstance.offerDraw();
    }
  }

  loadGame() {
    if (this.gameInstance && typeof this.gameInstance.loadGame === 'function') {
      return this.gameInstance.loadGame();
    }
  }

  updateStatus(message) {
    if (this.gameInstance && typeof this.gameInstance.updateStatus === 'function') {
      return this.gameInstance.updateStatus(message);
    }
  }

  render() {
    if (this.gameInstance && typeof this.gameInstance.render === 'function') {
      return this.gameInstance.render();
    }
  }

  updateUI() {
    if (this.gameInstance && typeof this.gameInstance.updateUI === 'function') {
      return this.gameInstance.updateUI();
    }
  }
}