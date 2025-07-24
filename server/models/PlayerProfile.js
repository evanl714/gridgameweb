import { randomUUID } from 'crypto';
import dbConnection from '../database/connection.js';

class PlayerProfile {
  constructor(data = {}) {
    this.id = data.id || randomUUID();
    this.name = data.name;
    this.displayName = data.displayName || data.display_name || data.name;
    this.preferences = data.preferences || '{}';
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.lastSeen = data.lastSeen || data.last_seen || new Date().toISOString();
  }

  /**
     * Save the player profile to database
     * @returns {PlayerProfile} The saved instance
     */
  save() {
    const db = dbConnection.getDatabase();

    const insertOrUpdateStmt = db.prepare(`
            INSERT OR REPLACE INTO player_profiles (
                id, name, display_name, preferences, created_at, last_seen
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

    insertOrUpdateStmt.run(
      this.id,
      this.name,
      this.displayName,
      typeof this.preferences === 'object' ? JSON.stringify(this.preferences) : this.preferences,
      this.createdAt
    );

    return this;
  }

  /**
     * Update player preferences
     * @param {Object} preferences - New preferences object
     * @returns {PlayerProfile} Updated instance
     */
  updatePreferences(preferences) {
    this.preferences = typeof preferences === 'object' ? JSON.stringify(preferences) : preferences;
    return this.save();
  }

  /**
     * Update last seen timestamp
     * @returns {PlayerProfile} Updated instance
     */
  updateLastSeen() {
    const db = dbConnection.getDatabase();

    const updateStmt = db.prepare(`
            UPDATE player_profiles 
            SET last_seen = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);

    updateStmt.run(this.id);
    this.lastSeen = new Date().toISOString();

    return this;
  }

  /**
     * Get player statistics
     * @returns {Object|null} Player statistics or null if not found
     */
  getStatistics() {
    const db = dbConnection.getDatabase();

    const stmt = db.prepare('SELECT * FROM player_statistics WHERE player_name = ?');
    const stats = stmt.get(this.name);

    return stats || null;
  }

  /**
     * Get player match history
     * @param {number} limit - Maximum number of matches to return
     * @returns {Array} Array of match history entries
     */
  getMatchHistory(limit = 20) {
    const db = dbConnection.getDatabase();

    const stmt = db.prepare(`
            SELECT * FROM match_history 
            WHERE player_1_name = ? OR player_2_name = ?
            ORDER BY ended_at DESC 
            LIMIT ?
        `);

    return stmt.all(this.name, this.name, limit);
  }

  /**
     * Delete the player profile and all associated data
     * @returns {boolean} Success status
     */
  delete() {
    const db = dbConnection.getDatabase();

    const deleteStmt = db.prepare('DELETE FROM player_profiles WHERE id = ?');
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
      name: this.name,
      displayName: this.displayName,
      preferences: typeof this.preferences === 'string' ? JSON.parse(this.preferences) : this.preferences,
      createdAt: this.createdAt,
      lastSeen: this.lastSeen
    };
  }

  // Static methods

  /**
     * Find player by ID
     * @param {string} id - Player ID
     * @returns {PlayerProfile|null} Player instance or null
     */
  static findById(id) {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE id = ?');
    const row = stmt.get(id);

    return row ? new PlayerProfile(row) : null;
  }

  /**
     * Find player by name
     * @param {string} name - Player name
     * @returns {PlayerProfile|null} Player instance or null
     */
  static findByName(name) {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare('SELECT * FROM player_profiles WHERE name = ?');
    const row = stmt.get(name);

    return row ? new PlayerProfile(row) : null;
  }

  /**
     * Find or create a player profile
     * @param {string} name - Player name
     * @param {Object} options - Additional options
     * @returns {PlayerProfile} Player profile instance
     */
  static findOrCreate(name, options = {}) {
    let player = PlayerProfile.findByName(name);

    if (!player) {
      player = PlayerProfile.create({
        name,
        displayName: options.displayName || name,
        preferences: options.preferences || {}
      });
    }

    return player;
  }

  /**
     * Find all players with pagination
     * @param {Object} options - Query options
     * @returns {Object} Results with players array and pagination info
     */
  static findAll(options = {}) {
    const db = dbConnection.getDatabase();
    const {
      limit = 20,
      offset = 0,
      orderBy = 'last_seen',
      orderDirection = 'DESC',
      search = null
    } = options;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = ' WHERE name LIKE ? OR display_name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM player_profiles${whereClause}`);
    const totalCount = countStmt.get(...params).total;

    const stmt = db.prepare(`
            SELECT * FROM player_profiles${whereClause}
            ORDER BY ${orderBy} ${orderDirection}
            LIMIT ? OFFSET ?
        `);

    const rows = stmt.all(...params, limit, offset);
    const players = rows.map(row => new PlayerProfile(row));

    return {
      players,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };
  }

  /**
     * Get player leaderboard
     * @param {Object} options - Query options
     * @returns {Array} Array of players with statistics
     */
  static getLeaderboard(options = {}) {
    const db = dbConnection.getDatabase();
    const {
      orderBy = 'win_rate',
      limit = 10,
      minGames = 5
    } = options;

    const stmt = db.prepare(`
            SELECT 
                pp.*,
                ps.games_played,
                ps.games_won,
                ps.games_lost,
                ps.games_drawn,
                ps.win_rate,
                ps.total_play_time,
                ps.average_game_length
            FROM player_profiles pp
            LEFT JOIN player_statistics ps ON pp.name = ps.player_name
            WHERE ps.games_played >= ?
            ORDER BY ps.${orderBy} DESC
            LIMIT ?
        `);

    const rows = stmt.all(minGames, limit);

    return rows.map(row => ({
      profile: new PlayerProfile(row),
      statistics: {
        gamesPlayed: row.games_played || 0,
        gamesWon: row.games_won || 0,
        gamesLost: row.games_lost || 0,
        gamesDrawn: row.games_drawn || 0,
        winRate: row.win_rate || 0,
        totalPlayTime: row.total_play_time || 0,
        averageGameLength: row.average_game_length || 0
      }
    }));
  }

  /**
     * Create a new player profile
     * @param {Object} playerData - Player data
     * @returns {PlayerProfile} New player instance
     */
  static create(playerData) {
    const player = new PlayerProfile(playerData);
    return player.save();
  }

  /**
     * Get total player count
     * @returns {number} Total number of players
     */
  static getTotalCount() {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM player_profiles');
    return stmt.get().count;
  }

  /**
     * Get recently active players
     * @param {number} hours - Hours to look back (default: 24)
     * @param {number} limit - Maximum players to return
     * @returns {PlayerProfile[]} Array of recently active players
     */
  static getRecentlyActive(hours = 24, limit = 10) {
    const db = dbConnection.getDatabase();

    const stmt = db.prepare(`
            SELECT * FROM player_profiles 
            WHERE last_seen > datetime('now', '-${hours} hours')
            ORDER BY last_seen DESC 
            LIMIT ?
        `);

    const rows = stmt.all(limit);
    return rows.map(row => new PlayerProfile(row));
  }
}

export default PlayerProfile;
