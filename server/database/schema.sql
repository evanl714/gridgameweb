-- SQLite Database Schema for Grid Game
-- Efficient design: Store game states as JSON blobs, not individual entities
-- Focus on persistent data: player stats, match history, saved games

PRAGMA foreign_keys = ON;

-- Active games table - Current/saved games with full serialized state
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    game_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
    serialized_state TEXT NOT NULL, -- Complete game state as JSON (from existing serialize() methods)
    player_1_name TEXT NOT NULL,
    player_2_name TEXT NOT NULL,
    current_turn INTEGER DEFAULT 1,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game saves table - Manual/auto saves for backup and resume
CREATE TABLE IF NOT EXISTS game_saves (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    save_name TEXT, -- User-defined name for manual saves
    save_type TEXT CHECK (save_type IN ('manual', 'auto', 'checkpoint')) DEFAULT 'manual',
    serialized_state TEXT NOT NULL, -- Complete game state snapshot
    save_metadata TEXT, -- JSON: turn, phase, timestamp, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

-- Player profiles table - Persistent player data across games
CREATE TABLE IF NOT EXISTS player_profiles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    preferences TEXT -- JSON: settings, themes, etc.
);

-- Player statistics table - Aggregate performance metrics
CREATE TABLE IF NOT EXISTS player_statistics (
    id TEXT PRIMARY KEY,
    player_name TEXT UNIQUE NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    games_drawn INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0, -- seconds
    total_turns_played INTEGER DEFAULT 0,
    units_created INTEGER DEFAULT 0,
    units_lost INTEGER DEFAULT 0,
    resources_gathered INTEGER DEFAULT 0,
    battles_fought INTEGER DEFAULT 0,
    battles_won INTEGER DEFAULT 0,
    longest_game INTEGER DEFAULT 0, -- turns
    shortest_game INTEGER DEFAULT 999, -- turns
    average_game_length REAL DEFAULT 0, -- turns
    win_rate REAL DEFAULT 0, -- percentage
    favorite_unit_type TEXT, -- most created unit type
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_name) REFERENCES player_profiles(name) ON DELETE CASCADE
);

-- Match history table - Completed games summary (lightweight)
CREATE TABLE IF NOT EXISTS match_history (
    id TEXT PRIMARY KEY,
    game_id TEXT UNIQUE NOT NULL,
    player_1_name TEXT NOT NULL,
    player_2_name TEXT NOT NULL,
    winner_name TEXT, -- NULL for draw
    game_duration INTEGER, -- seconds
    total_turns INTEGER,
    end_reason TEXT, -- 'base_destroyed', 'resignation', 'timeout', etc.
    final_stats TEXT, -- JSON: final scores, units, resources
    ended_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_1_name) REFERENCES player_profiles(name),
    FOREIGN KEY (player_2_name) REFERENCES player_profiles(name)
);

-- Temporary session data (auto-cleanup old entries)
CREATE TABLE IF NOT EXISTS session_data (
    id TEXT PRIMARY KEY,
    session_key TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL, -- JSON blob for temporary state
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System settings and configuration
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system configuration
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('schema_version', '1.0.0', 'Database schema version'),
('max_saved_games_per_player', '10', 'Maximum saved games per player'),
('session_timeout_hours', '24', 'Session timeout in hours'),
('cleanup_completed_games_days', '30', 'Days to keep completed games'),
('auto_save_interval_minutes', '5', 'Auto-save interval in minutes');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_last_activity ON games(last_activity);
CREATE INDEX IF NOT EXISTS idx_games_players ON games(player_1_name, player_2_name);
CREATE INDEX IF NOT EXISTS idx_game_saves_game_id ON game_saves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_type ON game_saves(save_type);
CREATE INDEX IF NOT EXISTS idx_player_profiles_name ON player_profiles(name);
CREATE INDEX IF NOT EXISTS idx_player_statistics_name ON player_statistics(player_name);
CREATE INDEX IF NOT EXISTS idx_player_statistics_win_rate ON player_statistics(win_rate);
CREATE INDEX IF NOT EXISTS idx_match_history_players ON match_history(player_1_name, player_2_name);
CREATE INDEX IF NOT EXISTS idx_match_history_ended_at ON match_history(ended_at);
CREATE INDEX IF NOT EXISTS idx_session_data_expires ON session_data(expires_at);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
    AFTER UPDATE ON games
BEGIN
    UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_player_statistics_timestamp 
    AFTER UPDATE ON player_statistics
BEGIN
    UPDATE player_statistics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_system_config_timestamp 
    AFTER UPDATE ON system_config
BEGIN
    UPDATE system_config SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- Trigger to update player last_seen
CREATE TRIGGER IF NOT EXISTS update_player_last_seen 
    AFTER UPDATE ON games
    WHEN NEW.updated_at > OLD.updated_at
BEGIN
    UPDATE player_profiles SET last_seen = CURRENT_TIMESTAMP 
    WHERE name = NEW.player_1_name OR name = NEW.player_2_name;
END;

-- Cleanup trigger for expired sessions
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
    AFTER INSERT ON session_data
BEGIN
    DELETE FROM session_data WHERE expires_at < CURRENT_TIMESTAMP;
END;