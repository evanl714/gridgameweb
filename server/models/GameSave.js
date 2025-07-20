import { randomUUID } from 'crypto';
import dbConnection from '../database/connection.js';

class GameSave {
    constructor(data = {}) {
        this.id = data.id || randomUUID();
        this.gameId = data.gameId || data.game_id;
        this.saveName = data.saveName || data.save_name || null;
        this.saveType = data.saveType || data.save_type || 'manual';
        this.serializedState = data.serializedState || data.serialized_state;
        this.saveMetadata = data.saveMetadata || data.save_metadata || null;
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    /**
     * Save the game save to database
     * @returns {GameSave} The saved instance
     */
    save() {
        const db = dbConnection.getDatabase();
        
        const insertStmt = db.prepare(`
            INSERT INTO game_saves (
                id, game_id, save_name, save_type, 
                serialized_state, save_metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
            this.id,
            this.gameId,
            this.saveName,
            this.saveType,
            this.serializedState,
            this.saveMetadata,
            this.createdAt
        );
        
        return this;
    }

    /**
     * Delete this save from database
     * @returns {boolean} Success status
     */
    delete() {
        const db = dbConnection.getDatabase();
        
        const deleteStmt = db.prepare('DELETE FROM game_saves WHERE id = ?');
        const result = deleteStmt.run(this.id);
        
        return result.changes > 0;
    }

    /**
     * Convert to JSON representation
     * @returns {Object} JSON object
     */
    toJSON() {
        return {
            id: this.id,
            gameId: this.gameId,
            saveName: this.saveName,
            saveType: this.saveType,
            serializedState: this.serializedState,
            saveMetadata: this.saveMetadata,
            createdAt: this.createdAt
        };
    }

    // Static methods

    /**
     * Find save by ID
     * @param {string} id - Save ID
     * @returns {GameSave|null} Save instance or null
     */
    static findById(id) {
        const db = dbConnection.getDatabase();
        const stmt = db.prepare('SELECT * FROM game_saves WHERE id = ?');
        const row = stmt.get(id);
        
        return row ? new GameSave(row) : null;
    }

    /**
     * Find all saves for a game
     * @param {string} gameId - Game ID
     * @returns {GameSave[]} Array of save instances
     */
    static findByGameId(gameId) {
        const db = dbConnection.getDatabase();
        const stmt = db.prepare(`
            SELECT * FROM game_saves 
            WHERE game_id = ? 
            ORDER BY created_at DESC
        `);
        const rows = stmt.all(gameId);
        
        return rows.map(row => new GameSave(row));
    }

    /**
     * Find saves by type
     * @param {string} saveType - Save type ('manual', 'auto', 'checkpoint')
     * @param {number} limit - Maximum number of saves to return
     * @returns {GameSave[]} Array of save instances
     */
    static findByType(saveType, limit = 50) {
        const db = dbConnection.getDatabase();
        const stmt = db.prepare(`
            SELECT * FROM game_saves 
            WHERE save_type = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        const rows = stmt.all(saveType, limit);
        
        return rows.map(row => new GameSave(row));
    }

    /**
     * Create a new save
     * @param {string} gameId - Game ID
     * @param {string} serializedState - Complete game state JSON
     * @param {Object} options - Save options
     * @returns {GameSave} New save instance
     */
    static create(gameId, serializedState, options = {}) {
        const {
            saveName = null,
            saveType = 'manual',
            metadata = {}
        } = options;

        // Add timestamp to metadata
        const saveMetadata = {
            ...metadata,
            timestamp: new Date().toISOString(),
            saveType
        };

        const saveData = {
            gameId,
            serializedState,
            saveName,
            saveType,
            saveMetadata: JSON.stringify(saveMetadata)
        };

        const gameSave = new GameSave(saveData);
        return gameSave.save();
    }

    /**
     * Create an auto-save for a game
     * @param {string} gameId - Game ID
     * @param {string} serializedState - Complete game state JSON
     * @param {Object} gameMetadata - Current game metadata (turn, phase, etc.)
     * @returns {GameSave} New auto-save instance
     */
    static createAutoSave(gameId, serializedState, gameMetadata = {}) {
        const db = dbConnection.getDatabase();
        
        return db.transaction(() => {
            // Get max auto-saves config
            const config = db.prepare('SELECT value FROM system_config WHERE key = ?').get('max_saved_games_per_player');
            const maxAutoSaves = config ? parseInt(config.value) : 10;
            
            // Clean up old auto-saves for this game (keep only recent ones)
            const cleanupStmt = db.prepare(`
                DELETE FROM game_saves 
                WHERE game_id = ? AND save_type = 'auto' 
                AND id NOT IN (
                    SELECT id FROM game_saves 
                    WHERE game_id = ? AND save_type = 'auto' 
                    ORDER BY created_at DESC 
                    LIMIT ?
                )
            `);
            cleanupStmt.run(gameId, gameId, maxAutoSaves - 1);
            
            // Create new auto-save
            return GameSave.create(gameId, serializedState, {
                saveType: 'auto',
                metadata: {
                    ...gameMetadata,
                    autoSaveReason: 'periodic'
                }
            });
        })();
    }

    /**
     * Clean up old auto-saves across all games
     * @param {number} daysToKeep - Days to keep auto-saves (default: 7)
     * @returns {number} Number of saves deleted
     */
    static cleanupOldAutoSaves(daysToKeep = 7) {
        const db = dbConnection.getDatabase();
        
        const deleteStmt = db.prepare(`
            DELETE FROM game_saves 
            WHERE save_type = 'auto' 
            AND created_at < datetime('now', '-${daysToKeep} days')
        `);
        
        const result = deleteStmt.run();
        return result.changes;
    }

    /**
     * Get save statistics
     * @returns {Object} Save statistics
     */
    static getStats() {
        const db = dbConnection.getDatabase();
        
        const statsStmt = db.prepare(`
            SELECT 
                save_type,
                COUNT(*) as count,
                MIN(created_at) as oldest,
                MAX(created_at) as newest
            FROM game_saves 
            GROUP BY save_type
        `);
        
        const stats = {};
        const rows = statsStmt.all();
        
        for (const row of rows) {
            stats[row.save_type] = {
                count: row.count,
                oldest: row.oldest,
                newest: row.newest
            };
        }
        
        return stats;
    }
}

export default GameSave;