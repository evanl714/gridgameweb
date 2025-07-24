import { randomUUID } from 'crypto';
import dbConnection from '../database/connection.js';

class Game {
  constructor(data = {}) {
    this.id = data.id || randomUUID();
    this.gameId = data.gameId || data.game_id || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.status = data.status || 'active';
    this.serializedState = data.serializedState || data.serialized_state || null;
    this.player1Name = data.player1Name || data.player_1_name || 'Player 1';
    this.player2Name = data.player2Name || data.player_2_name || 'Player 2';
    this.currentTurn = data.currentTurn || data.current_turn || 1;
    this.lastActivity = data.lastActivity || data.last_activity || new Date().toISOString();
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  /**
     * Save the game to database (create or update)
     * @returns {Game} The saved game instance
     */
  save() {
    const db = dbConnection.getDatabase();

    const insertOrUpdateStmt = db.prepare(`
            INSERT OR REPLACE INTO games (
                id, game_id, status, serialized_state, 
                player_1_name, player_2_name, current_turn, 
                last_activity, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

    insertOrUpdateStmt.run(
      this.id,
      this.gameId,
      this.status,
      this.serializedState,
      this.player1Name,
      this.player2Name,
      this.currentTurn,
      this.lastActivity,
      this.createdAt
    );

    return this;
  }

  /**
     * Update the game state
     * @param {string} serializedState - JSON string of complete game state
     * @param {number} currentTurn - Current turn number
     * @returns {Game} Updated game instance
     */
  updateState(serializedState, currentTurn = null) {
    this.serializedState = serializedState;
    if (currentTurn !== null) {
      this.currentTurn = currentTurn;
    }
    this.lastActivity = new Date().toISOString();

    return this.save();
  }

  /**
     * Mark game as completed and create match history entry
     * @param {string} winnerName - Name of winning player (null for draw)
     * @param {string} endReason - Reason game ended
     * @param {Object} finalStats - Final game statistics
     * @returns {Object} Match history entry
     */
  complete(winnerName = null, endReason = 'base_destroyed', finalStats = {}) {
    const db = dbConnection.getDatabase();

    return db.transaction(() => {
      // Update game status
      this.status = 'completed';
      this.save();

      // Parse game state to get duration and turn count
      let gameDuration = 0;
      let totalTurns = this.currentTurn;

      if (this.serializedState) {
        try {
          const gameState = JSON.parse(this.serializedState);
          if (gameState.metadata && gameState.metadata.playTime) {
            gameDuration = Math.floor(gameState.metadata.playTime / 1000); // Convert to seconds
          }
          if (gameState.turnNumber) {
            totalTurns = gameState.turnNumber;
          }
        } catch (error) {
          console.warn('Could not parse game state for completion stats:', error);
        }
      }

      // Create match history entry
      const matchHistoryStmt = db.prepare(`
                INSERT INTO match_history (
                    id, game_id, player_1_name, player_2_name, 
                    winner_name, game_duration, total_turns, 
                    end_reason, final_stats
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const matchHistoryId = randomUUID();
      matchHistoryStmt.run(
        matchHistoryId,
        this.gameId,
        this.player1Name,
        this.player2Name,
        winnerName,
        gameDuration,
        totalTurns,
        endReason,
        JSON.stringify(finalStats)
      );

      // Update player statistics
      this._updatePlayerStatistics(winnerName, gameDuration, totalTurns, finalStats);

      return {
        id: matchHistoryId,
        gameId: this.gameId,
        winnerName,
        gameDuration,
        totalTurns,
        endReason
      };
    })();
  }

  /**
     * Update player statistics after game completion
     * @private
     */
  _updatePlayerStatistics(winnerName, gameDuration, totalTurns, finalStats) {
    const db = dbConnection.getDatabase();

    // Ensure both players have statistics records
    for (const playerName of [this.player1Name, this.player2Name]) {
      const insertPlayerStmt = db.prepare(`
                INSERT OR IGNORE INTO player_statistics (
                    id, player_name, games_played, shortest_game
                ) VALUES (?, ?, 0, 999)
            `);
      insertPlayerStmt.run(randomUUID(), playerName);
    }

    // Update statistics for both players
    const updateStatsStmt = db.prepare(`
            UPDATE player_statistics SET
                games_played = games_played + 1,
                games_won = games_won + CASE WHEN ? = player_name THEN 1 ELSE 0 END,
                games_lost = games_lost + CASE WHEN ? != player_name AND ? IS NOT NULL THEN 1 ELSE 0 END,
                games_drawn = games_drawn + CASE WHEN ? IS NULL THEN 1 ELSE 0 END,
                total_play_time = total_play_time + ?,
                total_turns_played = total_turns_played + ?,
                longest_game = MAX(longest_game, ?),
                shortest_game = MIN(shortest_game, ?),
                average_game_length = CAST(total_turns_played + ? AS REAL) / (games_played + 1),
                win_rate = CAST((games_won + CASE WHEN ? = player_name THEN 1 ELSE 0 END) AS REAL) / (games_played + 1) * 100,
                updated_at = CURRENT_TIMESTAMP
            WHERE player_name = ?
        `);

    for (const playerName of [this.player1Name, this.player2Name]) {
      updateStatsStmt.run(
        winnerName, winnerName, winnerName, winnerName, // for win/loss/draw logic
        gameDuration,
        totalTurns,
        totalTurns, // for longest_game
        totalTurns, // for shortest_game
        totalTurns, // for average calculation
        winnerName, // for win_rate calculation
        playerName
      );
    }
  }

  /**
     * Delete the game and all associated data
     * @returns {boolean} Success status
     */
  delete() {
    const db = dbConnection.getDatabase();

    const deleteStmt = db.prepare('DELETE FROM games WHERE id = ?');
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
      status: this.status,
      serializedState: this.serializedState,
      player1Name: this.player1Name,
      player2Name: this.player2Name,
      currentTurn: this.currentTurn,
      lastActivity: this.lastActivity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Static methods for database queries

  /**
     * Find game by ID
     * @param {string} id - Game ID
     * @returns {Game|null} Game instance or null
     */
  static findById(id) {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    const row = stmt.get(id);

    return row ? new Game(row) : null;
  }

  /**
     * Find game by game ID
     * @param {string} gameId - Game ID string
     * @returns {Game|null} Game instance or null
     */
  static findByGameId(gameId) {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare('SELECT * FROM games WHERE game_id = ?');
    const row = stmt.get(gameId);

    return row ? new Game(row) : null;
  }

  /**
     * Find all active games for a player
     * @param {string} playerName - Player name
     * @returns {Game[]} Array of game instances
     */
  static findActiveGamesForPlayer(playerName) {
    const db = dbConnection.getDatabase();
    const stmt = db.prepare(`
            SELECT * FROM games 
            WHERE (player_1_name = ? OR player_2_name = ?) 
            AND status IN ('active', 'paused')
            ORDER BY last_activity DESC
        `);
    const rows = stmt.all(playerName, playerName);

    return rows.map(row => new Game(row));
  }

  /**
     * Find all games with pagination
     * @param {Object} options - Query options
     * @returns {Object} Results with games array and pagination info
     */
  static findAll(options = {}) {
    const db = dbConnection.getDatabase();
    const {
      status = null,
      playerName = null,
      limit = 20,
      offset = 0,
      orderBy = 'last_activity',
      orderDirection = 'DESC'
    } = options;

    let whereClause = '';
    let params = [];

    if (status) {
      whereClause += ' WHERE status = ?';
      params.push(status);
    }

    if (playerName) {
      whereClause += (whereClause ? ' AND' : ' WHERE') + ' (player_1_name = ? OR player_2_name = ?)';
      params.push(playerName, playerName);
    }

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM games${whereClause}`);
    const totalCount = countStmt.get(...params).total;

    const stmt = db.prepare(`
            SELECT * FROM games${whereClause}
            ORDER BY ${orderBy} ${orderDirection}
            LIMIT ? OFFSET ?
        `);

    const rows = stmt.all(...params, limit, offset);
    const games = rows.map(row => new Game(row));

    return {
      games,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };
  }

  /**
     * Create a new game
     * @param {Object} gameData - Initial game data
     * @returns {Game} New game instance
     */
  static create(gameData) {
    const game = new Game(gameData);
    return game.save();
  }
}

export default Game;
