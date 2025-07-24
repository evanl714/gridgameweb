/**
 * Database Persistence Layer
 * Integrates with existing localStorage persistence to provide server-side storage
 */

class DatabasePersistence {
  constructor() {
    this.baseUrl = window.location.origin;
    this.isOnline = navigator.onLine;
    this.pendingSync = new Set();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
     * Make an API request with error handling
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} API response
     */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (!this.isOnline) {
        // Store operation for later sync
        this.pendingSync.add({ endpoint, options });
        throw new Error('Offline - operation queued for sync');
      }
      throw error;
    }
  }

  /**
     * Sync pending operations when back online
     */
  async syncPendingOperations() {
    if (!this.isOnline || this.pendingSync.size === 0) return;

    const operations = Array.from(this.pendingSync);
    this.pendingSync.clear();

    for (const { endpoint, options } of operations) {
      try {
        await this.apiRequest(endpoint, options);
        console.log('Synced pending operation:', endpoint);
      } catch (error) {
        console.error('Failed to sync operation:', endpoint, error);
        // Re-add to pending if still failing
        this.pendingSync.add({ endpoint, options });
      }
    }
  }

  /**
     * Save game to database
     * @param {Object} gameState - Complete game state object
     * @param {Object} options - Save options
     * @returns {Promise} Save result
     */
  async saveGame(gameState, options = {}) {
    const { gameId, player1Name, player2Name, currentTurn } = options;

    const serializedState = JSON.stringify(gameState);

    const payload = {
      gameId: gameId || gameState.gameId || `game_${Date.now()}`,
      serializedState,
      player1Name: player1Name || 'Player 1',
      player2Name: player2Name || 'Player 2',
      currentTurn: currentTurn || gameState.turnNumber || 1
    };

    return await this.apiRequest('/games', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Update existing game state
     * @param {string} gameId - Game ID
     * @param {Object} gameState - Updated game state
     * @param {number} currentTurn - Current turn number
     * @returns {Promise} Update result
     */
  async updateGame(gameId, gameState, currentTurn = null) {
    const serializedState = JSON.stringify(gameState);

    const payload = {
      serializedState,
      currentTurn: currentTurn || gameState.turnNumber
    };

    return await this.apiRequest(`/games/by-game-id/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Load game from database
     * @param {string} gameId - Game ID
     * @returns {Promise} Game data
     */
  async loadGame(gameId) {
    const response = await this.apiRequest(`/games/by-game-id/${gameId}`);

    if (response.success && response.data.serializedState) {
      return JSON.parse(response.data.serializedState);
    }

    throw new Error('Game not found or has no saved state');
  }

  /**
     * Create a manual save
     * @param {string} gameId - Game ID
     * @param {Object} gameState - Complete game state
     * @param {string} saveName - User-defined save name
     * @returns {Promise} Save result
     */
  async createManualSave(gameId, gameState, saveName) {
    const serializedState = JSON.stringify(gameState);

    const payload = {
      gameId,
      serializedState,
      saveName,
      saveType: 'manual',
      metadata: {
        turnNumber: gameState.turnNumber,
        currentPlayer: gameState.currentPlayer,
        timestamp: new Date().toISOString()
      }
    };

    return await this.apiRequest('/saves', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Create an auto-save
     * @param {string} gameId - Game ID
     * @param {Object} gameState - Complete game state
     * @returns {Promise} Save result
     */
  async createAutoSave(gameId, gameState) {
    const serializedState = JSON.stringify(gameState);

    const payload = {
      gameId,
      serializedState,
      metadata: {
        turnNumber: gameState.turnNumber,
        currentPlayer: gameState.currentPlayer,
        phase: gameState.currentPhase,
        timestamp: new Date().toISOString(),
        autoSaveReason: 'periodic'
      }
    };

    return await this.apiRequest('/saves/auto-save', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Load a specific save
     * @param {string} saveId - Save ID
     * @returns {Promise} Game state from save
     */
  async loadSave(saveId) {
    const response = await this.apiRequest(`/saves/${saveId}`);

    if (response.success && response.data.serializedState) {
      return JSON.parse(response.data.serializedState);
    }

    throw new Error('Save not found or corrupted');
  }

  /**
     * Get all saves for a game
     * @param {string} gameId - Game ID
     * @returns {Promise} Array of saves
     */
  async getGameSaves(gameId) {
    // Get game first to find database ID
    const gameResponse = await this.apiRequest(`/games/by-game-id/${gameId}`);
    if (!gameResponse.success) {
      throw new Error('Game not found');
    }

    const response = await this.apiRequest(`/games/${gameResponse.data.id}/saves`);
    return response.success ? response.data : [];
  }

  /**
     * Complete a game and create match history
     * @param {string} gameId - Game ID
     * @param {string} winnerName - Winner name (null for draw)
     * @param {string} endReason - How the game ended
     * @param {Object} finalStats - Final game statistics
     * @returns {Promise} Completion result
     */
  async completeGame(gameId, winnerName = null, endReason = 'base_destroyed', finalStats = {}) {
    // Get game first
    const gameResponse = await this.apiRequest(`/games/by-game-id/${gameId}`);
    if (!gameResponse.success) {
      throw new Error('Game not found');
    }

    const payload = {
      winnerName,
      endReason,
      finalStats
    };

    return await this.apiRequest(`/games/${gameResponse.data.id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Get or create player profile
     * @param {string} playerName - Player name
     * @param {Object} options - Additional player data
     * @returns {Promise} Player profile
     */
  async getOrCreatePlayer(playerName, options = {}) {
    const payload = {
      name: playerName,
      displayName: options.displayName || playerName,
      preferences: options.preferences || {}
    };

    return await this.apiRequest('/players', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
     * Get player statistics
     * @param {string} playerName - Player name
     * @returns {Promise} Player statistics
     */
  async getPlayerStatistics(playerName) {
    try {
      const playerResponse = await this.apiRequest(`/players/by-name/${playerName}`);
      if (!playerResponse.success) {
        throw new Error('Player not found');
      }

      const statsResponse = await this.apiRequest(`/players/${playerResponse.data.id}/statistics`);
      return statsResponse.success ? statsResponse.data.statistics : null;
    } catch (error) {
      console.warn('Could not fetch player statistics:', error);
      return null;
    }
  }

  /**
     * Get player match history
     * @param {string} playerName - Player name
     * @param {number} limit - Number of matches to return
     * @returns {Promise} Match history array
     */
  async getPlayerMatchHistory(playerName, limit = 20) {
    try {
      const playerResponse = await this.apiRequest(`/players/by-name/${playerName}`);
      if (!playerResponse.success) {
        throw new Error('Player not found');
      }

      const historyResponse = await this.apiRequest(`/players/${playerResponse.data.id}/match-history?limit=${limit}`);
      return historyResponse.success ? historyResponse.data.matchHistory : [];
    } catch (error) {
      console.warn('Could not fetch match history:', error);
      return [];
    }
  }

  /**
     * Get leaderboard
     * @param {Object} options - Query options
     * @returns {Promise} Leaderboard data
     */
  async getLeaderboard(options = {}) {
    const params = new URLSearchParams();
    if (options.orderBy) params.append('orderBy', options.orderBy);
    if (options.limit) params.append('limit', options.limit);
    if (options.minGames) params.append('minGames', options.minGames);

    const response = await this.apiRequest(`/players/leaderboard?${params}`);
    return response.success ? response.data : [];
  }

  /**
     * Get database health status
     * @returns {Promise} Health status
     */
  async getHealth() {
    return await this.apiRequest('/health');
  }

  /**
     * Test database connectivity
     * @returns {Promise<boolean>} True if database is accessible
     */
  async testConnection() {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.warn('Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const databasePersistence = new DatabasePersistence();
export default databasePersistence;
