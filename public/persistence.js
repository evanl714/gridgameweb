/**
 * Game State Persistence System
 * Handles saving and loading game state to/from localStorage and database
 */

import { GameState } from './gameState.js';
import { ResourceManager } from './resourceManager.js';
import databasePersistence from './databasePersistence.js';

export class PersistenceManager {
  constructor() {
    this.SAVE_KEY = 'gridgame_save';
    this.AUTO_SAVE_KEY = 'gridgame_autosave';
    this.SETTINGS_KEY = 'gridgame_settings';
    this.SAVE_VERSION = '1.0.0';
    this.databaseEnabled = true;
    this.fallbackToLocal = true;

    // Test database connectivity on initialization
    this.testDatabaseConnection();
  }

  /**
   * Test database connectivity and set availability flag
   */
  async testDatabaseConnection() {
    try {
      const isConnected = await databasePersistence.testConnection();
      this.databaseEnabled = isConnected;
      if (!isConnected) {
        console.warn('Database not available, using localStorage only');
      } else {
        console.log('Database persistence enabled');
      }
    } catch (error) {
      console.warn('Database connection test failed:', error);
      this.databaseEnabled = false;
    }
  }

  /**
     * Save game state to localStorage and database
     */
  async saveGame(gameState, resourceManager, isAutoSave = false, options = {}) {
    const saveData = {
      version: this.SAVE_VERSION,
      timestamp: new Date().toISOString(),
      gameState: gameState.serialize(),
      resourceManager: resourceManager.serialize(),
      metadata: {
        turnNumber: gameState.turnNumber,
        currentPlayer: gameState.currentPlayer,
        gameStatus: gameState.status,
        playTime: this.calculatePlayTime(gameState)
      }
    };

    // Always save to localStorage first (immediate backup)
    const localResult = this.saveToLocalStorage(saveData, isAutoSave);

    // Try to save to database if enabled
    let dbResult = null;
    if (this.databaseEnabled) {
      try {
        if (isAutoSave) {
          dbResult = await databasePersistence.createAutoSave(
            gameState.gameId || options.gameId || 'local_game',
            saveData
          );
        } else {
          // For manual saves, update the main game record
          const combinedState = { ...saveData.gameState, ...saveData.resourceManager };
          dbResult = await databasePersistence.updateGame(
            gameState.gameId || options.gameId || 'local_game',
            combinedState,
            gameState.turnNumber
          );
        }
      } catch (error) {
        console.warn('Database save failed, using localStorage only:', error);
        dbResult = { success: false, error: error.message };
      }
    }

    return {
      success: localResult.success,
      timestamp: saveData.timestamp,
      size: JSON.stringify(saveData).length,
      localStorage: localResult,
      database: dbResult
    };
  }

  /**
   * Save to localStorage only (internal method)
   */
  saveToLocalStorage(saveData, isAutoSave = false) {
    try {
      const key = isAutoSave ? this.AUTO_SAVE_KEY : this.SAVE_KEY;
      localStorage.setItem(key, JSON.stringify(saveData));

      return {
        success: true,
        timestamp: saveData.timestamp,
        size: JSON.stringify(saveData).length
      };
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Load game state from database or localStorage
     */
  async loadGame(gameId = null, isAutoSave = false) {
    // Try database first if gameId provided and database is enabled
    if (gameId && this.databaseEnabled) {
      try {
        const gameStateData = await databasePersistence.loadGame(gameId);
        return this.deserializeGameData(gameStateData, 'database');
      } catch (error) {
        console.warn('Database load failed, trying localStorage:', error);
      }
    }

    // Fallback to localStorage
    return this.loadFromLocalStorage(isAutoSave);
  }

  /**
   * Load from localStorage only (internal method)
   */
  loadFromLocalStorage(isAutoSave = false) {
    try {
      const key = isAutoSave ? this.AUTO_SAVE_KEY : this.SAVE_KEY;
      const saveData = localStorage.getItem(key);

      if (!saveData) {
        return {
          success: false,
          error: 'No save data found'
        };
      }

      const parsedData = JSON.parse(saveData);

      // Version compatibility check
      if (!this.isCompatibleVersion(parsedData.version)) {
        return {
          success: false,
          error: `Incompatible save version: ${parsedData.version}`
        };
      }

      return this.deserializeGameData(parsedData, 'localStorage');
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deserialize game data from any source
   */
  deserializeGameData(data, source = 'unknown') {
    try {
      // Handle different data formats
      let gameStateData, resourceManagerData, metadata, timestamp;

      if (data.gameState && data.resourceManager) {
        // localStorage format
        gameStateData = data.gameState;
        resourceManagerData = data.resourceManager;
        metadata = data.metadata;
        timestamp = data.timestamp;
      } else {
        // Database format (combined state)
        gameStateData = data;
        resourceManagerData = data; // Combined in database
        metadata = data.metadata || {};
        timestamp = data.timestamp || new Date().toISOString();
      }

      // Restore game state
      const gameState = GameState.deserialize(gameStateData);
      const resourceManager = ResourceManager.deserialize(resourceManagerData, gameState);

      return {
        success: true,
        gameState: gameState,
        resourceManager: resourceManager,
        metadata: metadata,
        timestamp: timestamp,
        source: source
      };
    } catch (error) {
      console.error('Failed to deserialize game data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Check if save file exists
     */
  hasSaveFile(isAutoSave = false) {
    const key = isAutoSave ? this.AUTO_SAVE_KEY : this.SAVE_KEY;
    return localStorage.getItem(key) !== null;
  }

  /**
     * Get save file information without loading
     */
  getSaveInfo(isAutoSave = false) {
    try {
      const key = isAutoSave ? this.AUTO_SAVE_KEY : this.SAVE_KEY;
      const saveData = localStorage.getItem(key);

      if (!saveData) {
        return null;
      }

      const parsedData = JSON.parse(saveData);
      return {
        timestamp: parsedData.timestamp,
        version: parsedData.version,
        metadata: parsedData.metadata,
        size: saveData.length,
        isCompatible: this.isCompatibleVersion(parsedData.version)
      };
    } catch (error) {
      console.error('Failed to get save info:', error);
      return null;
    }
  }

  /**
     * Delete save file
     */
  deleteSave(isAutoSave = false) {
    const key = isAutoSave ? this.AUTO_SAVE_KEY : this.SAVE_KEY;
    localStorage.removeItem(key);
    return true;
  }

  /**
     * Export save to JSON file for download
     */
  exportSave(gameState, resourceManager) {
    try {
      const saveData = {
        version: this.SAVE_VERSION,
        timestamp: new Date().toISOString(),
        gameState: gameState.serialize(),
        resourceManager: resourceManager.serialize(),
        metadata: {
          turnNumber: gameState.turnNumber,
          currentPlayer: gameState.currentPlayer,
          gameStatus: gameState.status,
          playTime: this.calculatePlayTime(gameState)
        }
      };

      const dataStr = JSON.stringify(saveData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const filename = `gridgame_save_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;

      return {
        success: true,
        dataUri: dataUri,
        filename: filename,
        size: dataStr.length
      };
    } catch (error) {
      console.error('Failed to export save:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Import save from JSON file
     */
  importSave(jsonString) {
    try {
      const saveData = JSON.parse(jsonString);

      // Validate save data structure
      if (!this.validateSaveData(saveData)) {
        return {
          success: false,
          error: 'Invalid save file format'
        };
      }

      // Version compatibility check
      if (!this.isCompatibleVersion(saveData.version)) {
        return {
          success: false,
          error: `Incompatible save version: ${saveData.version}`
        };
      }

      // Restore game state
      const gameState = GameState.deserialize(saveData.gameState);
      const resourceManager = ResourceManager.deserialize(saveData.resourceManager, gameState);

      return {
        success: true,
        gameState: gameState,
        resourceManager: resourceManager,
        metadata: saveData.metadata,
        timestamp: saveData.timestamp
      };
    } catch (error) {
      console.error('Failed to import save:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Auto-save functionality
     */
  enableAutoSave(gameState, resourceManager, intervalMinutes = 5) {
    // Clear existing auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (gameState.status === 'playing') {
        const result = this.saveGame(gameState, resourceManager, true);
        if (result.success) {
          console.log('Auto-save completed:', result.timestamp);
          gameState.emit('autoSaveCompleted', result);
        } else {
          console.error('Auto-save failed:', result.error);
          gameState.emit('autoSaveFailed', result);
        }
      }
    }, intervalMinutes * 60 * 1000);

    return this.autoSaveInterval;
  }

  /**
     * Disable auto-save
     */
  disableAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
     * Save game settings
     */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
     * Load game settings
     */
  loadSettings() {
    try {
      const settings = localStorage.getItem(this.SETTINGS_KEY);
      return settings ? JSON.parse(settings) : this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
     * Get default settings
     */
  getDefaultSettings() {
    return {
      autoSave: true,
      autoSaveInterval: 5, // minutes
      soundEnabled: true,
      animationsEnabled: true,
      gridLines: true,
      coordinateDisplay: false,
      confirmActions: true
    };
  }

  /**
     * Check version compatibility
     */
  isCompatibleVersion(version) {
    const [major, minor] = version.split('.').map(Number);
    const [currentMajor, currentMinor] = this.SAVE_VERSION.split('.').map(Number);

    // Same major version is compatible
    return major === currentMajor;
  }

  /**
     * Validate save data structure
     */
  validateSaveData(data) {
    return data &&
               data.version &&
               data.gameState &&
               data.resourceManager &&
               data.metadata &&
               data.timestamp;
  }

  /**
     * Calculate play time from game state
     */
  calculatePlayTime(gameState) {
    // Simple calculation based on turn number
    // In a real implementation, you'd track actual play time
    return gameState.turnNumber * 2; // minutes
  }

  /**
     * Get storage usage information
     */
  getStorageInfo() {
    try {
      const saves = {};

      if (this.hasSaveFile(false)) {
        saves.manual = this.getSaveInfo(false);
      }

      if (this.hasSaveFile(true)) {
        saves.auto = this.getSaveInfo(true);
      }

      const settings = localStorage.getItem(this.SETTINGS_KEY);
      const settingsSize = settings ? settings.length : 0;

      const totalSize = Object.values(saves).reduce((total, save) => total + (save?.size || 0), 0) + settingsSize;

      return {
        saves: saves,
        settingsSize: settingsSize,
        totalSize: totalSize,
        maxSize: 5 * 1024 * 1024, // 5MB typical localStorage limit
        usage: totalSize / (5 * 1024 * 1024)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  /**
     * Clear all game data
     */
  clearAllData() {
    localStorage.removeItem(this.SAVE_KEY);
    localStorage.removeItem(this.AUTO_SAVE_KEY);
    localStorage.removeItem(this.SETTINGS_KEY);
    this.disableAutoSave();
    return true;
  }

  // Database integration methods

  /**
   * Create a new game in the database
   */
  async createDatabaseGame(gameState, resourceManager, player1Name, player2Name) {
    if (!this.databaseEnabled) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const combinedState = {
        ...gameState.serialize(),
        ...resourceManager.serialize()
      };

      const result = await databasePersistence.saveGame(combinedState, {
        gameId: gameState.gameId,
        player1Name,
        player2Name,
        currentTurn: gameState.turnNumber
      });

      return result;
    } catch (error) {
      console.error('Failed to create database game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete a game and update statistics
   */
  async completeGame(gameId, winnerName, endReason = 'base_destroyed', finalStats = {}) {
    if (!this.databaseEnabled) {
      return { success: false, error: 'Database not available' };
    }

    try {
      return await databasePersistence.completeGame(gameId, winnerName, endReason, finalStats);
    } catch (error) {
      console.error('Failed to complete game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStatistics(playerName) {
    if (!this.databaseEnabled) {
      return null;
    }

    try {
      return await databasePersistence.getPlayerStatistics(playerName);
    } catch (error) {
      console.error('Failed to get player statistics:', error);
      return null;
    }
  }

  /**
   * Get player match history
   */
  async getPlayerMatchHistory(playerName, limit = 20) {
    if (!this.databaseEnabled) {
      return [];
    }

    try {
      return await databasePersistence.getPlayerMatchHistory(playerName, limit);
    } catch (error) {
      console.error('Failed to get match history:', error);
      return [];
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(options = {}) {
    if (!this.databaseEnabled) {
      return [];
    }

    try {
      return await databasePersistence.getLeaderboard(options);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get all saves for a game (database only)
   */
  async getGameSaves(gameId) {
    if (!this.databaseEnabled) {
      return [];
    }

    try {
      return await databasePersistence.getGameSaves(gameId);
    } catch (error) {
      console.error('Failed to get game saves:', error);
      return [];
    }
  }

  /**
   * Load from a specific save
   */
  async loadFromSave(saveId) {
    if (!this.databaseEnabled) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const gameStateData = await databasePersistence.loadSave(saveId);
      return this.deserializeGameData(gameStateData, 'database_save');
    } catch (error) {
      console.error('Failed to load from save:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if database is available
   */
  isDatabaseAvailable() {
    return this.databaseEnabled;
  }

  /**
   * Retry database connection
   */
  async retryDatabaseConnection() {
    await this.testDatabaseConnection();
    return this.databaseEnabled;
  }
}
