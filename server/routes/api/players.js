import express from 'express';
import { PlayerProfile } from '../../models/index.js';

const router = express.Router();

/**
 * GET /api/players - Get all players with optional search and pagination
 */
router.get('/', async (req, res) => {
    try {
        const options = {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0,
            orderBy: req.query.orderBy || 'last_seen',
            orderDirection: req.query.orderDirection || 'DESC',
            search: req.query.search
        };

        const result = PlayerProfile.findAll(options);
        
        res.json({
            success: true,
            data: result.players.map(player => player.toJSON()),
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch players',
            message: error.message
        });
    }
});

/**
 * GET /api/players/leaderboard - Get player leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const options = {
            orderBy: req.query.orderBy || 'win_rate',
            limit: parseInt(req.query.limit) || 10,
            minGames: parseInt(req.query.minGames) || 5
        };

        const leaderboard = PlayerProfile.getLeaderboard(options);
        
        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard',
            message: error.message
        });
    }
});

/**
 * GET /api/players/recent - Get recently active players
 */
router.get('/recent', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        const limit = parseInt(req.query.limit) || 10;

        const players = PlayerProfile.getRecentlyActive(hours, limit);
        
        res.json({
            success: true,
            data: players.map(player => player.toJSON())
        });
    } catch (error) {
        console.error('Error fetching recent players:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent players',
            message: error.message
        });
    }
});

/**
 * GET /api/players/:id - Get specific player by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        res.json({
            success: true,
            data: player.toJSON()
        });
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player',
            message: error.message
        });
    }
});

/**
 * GET /api/players/by-name/:name - Get specific player by name
 */
router.get('/by-name/:name', async (req, res) => {
    try {
        const player = PlayerProfile.findByName(req.params.name);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        res.json({
            success: true,
            data: player.toJSON()
        });
    } catch (error) {
        console.error('Error fetching player:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player',
            message: error.message
        });
    }
});

/**
 * POST /api/players - Create or find a player profile
 */
router.post('/', async (req, res) => {
    try {
        const { name, displayName, preferences } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: name'
            });
        }

        const player = PlayerProfile.findOrCreate(name, {
            displayName,
            preferences
        });

        res.status(201).json({
            success: true,
            data: player.toJSON()
        });
    } catch (error) {
        console.error('Error creating/finding player:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create/find player',
            message: error.message
        });
    }
});

/**
 * PUT /api/players/:id - Update player profile
 */
router.put('/:id', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        const { displayName, preferences } = req.body;

        if (displayName) {
            player.displayName = displayName;
        }

        if (preferences) {
            player.updatePreferences(preferences);
        } else {
            player.save();
        }

        res.json({
            success: true,
            data: player.toJSON()
        });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update player',
            message: error.message
        });
    }
});

/**
 * POST /api/players/:id/activity - Update player last seen
 */
router.post('/:id/activity', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        player.updateLastSeen();

        res.json({
            success: true,
            data: player.toJSON()
        });
    } catch (error) {
        console.error('Error updating player activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update player activity',
            message: error.message
        });
    }
});

/**
 * GET /api/players/:id/statistics - Get player statistics
 */
router.get('/:id/statistics', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        const statistics = player.getStatistics();

        res.json({
            success: true,
            data: {
                player: player.toJSON(),
                statistics
            }
        });
    } catch (error) {
        console.error('Error fetching player statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch player statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/players/:id/match-history - Get player match history
 */
router.get('/:id/match-history', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        const limit = parseInt(req.query.limit) || 20;
        const matchHistory = player.getMatchHistory(limit);

        res.json({
            success: true,
            data: {
                player: player.toJSON(),
                matchHistory
            }
        });
    } catch (error) {
        console.error('Error fetching match history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch match history',
            message: error.message
        });
    }
});

/**
 * DELETE /api/players/:id - Delete a player profile
 */
router.delete('/:id', async (req, res) => {
    try {
        const player = PlayerProfile.findById(req.params.id);
        
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'Player not found'
            });
        }

        const deleted = player.delete();

        if (deleted) {
            res.json({
                success: true,
                message: 'Player deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete player'
            });
        }
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete player',
            message: error.message
        });
    }
});

export default router;