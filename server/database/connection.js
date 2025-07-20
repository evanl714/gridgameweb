import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseConnection {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the database connection and create tables
     * @param {string} dbPath - Path to SQLite database file (defaults to './game.db')
     */
    async initialize(dbPath = './game.db') {
        try {
            // Create database connection
            this.db = new Database(dbPath);
            
            // Enable WAL mode for better performance with concurrent access
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('synchronous = NORMAL');
            
            // Load and execute schema
            const schemaPath = join(__dirname, 'schema.sql');
            const schema = readFileSync(schemaPath, 'utf8');
            this.db.exec(schema);
            
            this.isInitialized = true;
            console.log('Database initialized successfully');
            
            return this.db;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Get the database instance
     * @returns {Database} SQLite database instance
     */
    getDatabase() {
        if (!this.isInitialized || !this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            console.log('Database connection closed');
        }
    }

    /**
     * Execute a transaction with automatic rollback on error
     * @param {Function} transactionFn - Function containing database operations
     * @returns {any} Result of the transaction function
     */
    transaction(transactionFn) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(transactionFn);
        return transaction();
    }

    /**
     * Backup the database to a file
     * @param {string} backupPath - Path for backup file
     */
    backup(backupPath) {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }
        
        this.db.backup(backupPath);
        console.log(`Database backed up to ${backupPath}`);
    }

    /**
     * Get database statistics
     * @returns {Object} Database stats
     */
    getStats() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        const tables = [
            'games', 'game_saves', 'player_profiles', 
            'player_statistics', 'match_history', 'session_data'
        ];
        
        const stats = {};
        
        for (const table of tables) {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
            stats[table] = result.count;
        }
        
        // Get database file size
        const sizeResult = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get();
        stats.database_size_bytes = sizeResult.size;
        
        return stats;
    }

    /**
     * Clean up expired sessions and old data
     */
    cleanup() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        const cleanupTasks = this.db.transaction(() => {
            // Remove expired sessions
            const expiredSessions = this.db.prepare('DELETE FROM session_data WHERE expires_at < CURRENT_TIMESTAMP').run();
            
            // Get cleanup days from config
            const config = this.db.prepare('SELECT value FROM system_config WHERE key = ?').get('cleanup_completed_games_days');
            const cleanupDays = config ? parseInt(config.value) : 30;
            
            // Remove old completed games (keep match history)
            const oldGames = this.db.prepare(`
                DELETE FROM games 
                WHERE status = 'completed' 
                AND updated_at < datetime('now', '-${cleanupDays} days')
            `).run();
            
            // Remove old auto-saves (keep manual saves)
            const oldAutoSaves = this.db.prepare(`
                DELETE FROM game_saves 
                WHERE save_type = 'auto' 
                AND created_at < datetime('now', '-7 days')
            `).run();
            
            return {
                expiredSessions: expiredSessions.changes,
                oldGames: oldGames.changes,
                oldAutoSaves: oldAutoSaves.changes
            };
        });

        const results = cleanupTasks();
        console.log('Database cleanup completed:', results);
        return results;
    }

    /**
     * Validate database integrity
     * @returns {boolean} True if database is valid
     */
    validateIntegrity() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized');
        }

        try {
            // Check database integrity
            const integrityCheck = this.db.prepare('PRAGMA integrity_check').get();
            if (integrityCheck.integrity_check !== 'ok') {
                console.error('Database integrity check failed:', integrityCheck);
                return false;
            }

            // Check foreign key consistency
            const foreignKeyCheck = this.db.prepare('PRAGMA foreign_key_check').all();
            if (foreignKeyCheck.length > 0) {
                console.error('Foreign key constraint violations:', foreignKeyCheck);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Database validation failed:', error);
            return false;
        }
    }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;