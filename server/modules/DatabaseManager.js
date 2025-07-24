/**
 * DatabaseManager - Handles database initialization and lifecycle
 * Extracted from server startup to improve separation of concerns
 */

import dbConnection from '../database/connection.js';

export class DatabaseManager {
  constructor(dbPath = './game.db') {
    this.dbPath = dbPath;
    this.isInitialized = false;
    this.cleanupInterval = null;
  }

  /**
   * Initialize database connection and validate integrity
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log('Initializing database...');
      await dbConnection.initialize(this.dbPath);

      // Validate database integrity
      const isValid = dbConnection.validateIntegrity();
      if (!isValid) {
        throw new Error('Database integrity check failed');
      }

      this.isInitialized = true;
      console.log('Database initialized and ready');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start periodic cleanup tasks
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 1 hour)
   */
  startPeriodicCleanup(intervalMs = 60 * 60 * 1000) {
    if (this.cleanupInterval) {
      console.warn('Periodic cleanup already running');
      return;
    }

    this.cleanupInterval = setInterval(() => {
      try {
        const results = dbConnection.cleanup();
        if (results.expiredSessions > 0 || results.oldGames > 0 || results.oldAutoSaves > 0) {
          console.log('Periodic database cleanup:', results);
        }
      } catch (error) {
        console.error('Periodic cleanup failed:', error);
      }
    }, intervalMs);

    console.log('Periodic database cleanup started');
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Periodic database cleanup stopped');
    }
  }

  /**
   * Gracefully close database connection
   */
  close() {
    this.stopPeriodicCleanup();

    if (this.isInitialized) {
      dbConnection.close();
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Get database connection status
   * @returns {boolean}
   */
  getStatus() {
    return this.isInitialized;
  }

  /**
   * Perform manual cleanup
   * @returns {Object} Cleanup results
   */
  manualCleanup() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const results = dbConnection.cleanup();
      console.log('Manual database cleanup completed:', results);
      return results;
    } catch (error) {
      console.error('Manual cleanup failed:', error);
      throw error;
    }
  }
}
