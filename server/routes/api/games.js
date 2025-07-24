import express from 'express';
import { Game, GameSave } from '../../models/index.js';

const router = express.Router();

/**
 * GET /api/games - Get all games with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      playerName: req.query.player,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      orderBy: req.query.orderBy || 'last_activity',
      orderDirection: req.query.orderDirection || 'DESC'
    };

    const result = Game.findAll(options);

    res.json({
      success: true,
      data: result.games.map(game => game.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games',
      message: error.message
    });
  }
});

/**
 * GET /api/games/by-game-id/:gameId - Get specific game by game ID
 */
router.get('/by-game-id/:gameId', async (req, res) => {
  try {
    const game = Game.findByGameId(req.params.gameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: game.toJSON()
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game',
      message: error.message
    });
  }
});

/**
 * POST /api/games - Create a new game
 */
router.post('/', async (req, res) => {
  try {
    const { gameId, serializedState, player1Name, player2Name } = req.body;

    if (!serializedState || !player1Name || !player2Name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: serializedState, player1Name, player2Name'
      });
    }

    const gameData = {
      gameId,
      serializedState,
      player1Name,
      player2Name,
      status: 'active'
    };

    const game = Game.create(gameData);

    res.status(201).json({
      success: true,
      data: game.toJSON()
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game',
      message: error.message
    });
  }
});

/**
 * PUT /api/games/:id - Update game state
 */
router.put('/:id', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { serializedState, currentTurn, status } = req.body;

    if (serializedState) {
      game.updateState(serializedState, currentTurn);
    }

    if (status) {
      game.status = status;
      game.save();
    }

    res.json({
      success: true,
      data: game.toJSON()
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      message: error.message
    });
  }
});

/**
 * POST /api/games/:id/complete - Mark game as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { winnerName, endReason, finalStats } = req.body;

    const matchHistory = game.complete(winnerName, endReason, finalStats || {});

    res.json({
      success: true,
      data: {
        game: game.toJSON(),
        matchHistory
      }
    });
  } catch (error) {
    console.error('Error completing game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game',
      message: error.message
    });
  }
});

/**
 * DELETE /api/games/:id - Delete a game
 */
router.delete('/:id', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const deleted = game.delete();

    if (deleted) {
      res.json({
        success: true,
        message: 'Game deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete game'
      });
    }
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game',
      message: error.message
    });
  }
});

/**
 * GET /api/games/:id/saves - Get all saves for a game
 */
router.get('/:id/saves', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const saves = GameSave.findByGameId(game.gameId);

    res.json({
      success: true,
      data: saves.map(save => save.toJSON())
    });
  } catch (error) {
    console.error('Error fetching game saves:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game saves',
      message: error.message
    });
  }
});

/**
 * POST /api/games/:id/saves - Create a new save for a game
 */
router.post('/:id/saves', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { saveName, saveType, serializedState, metadata } = req.body;

    if (!serializedState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: serializedState'
      });
    }

    const gameSave = GameSave.create(game.gameId, serializedState, {
      saveName,
      saveType: saveType || 'manual',
      metadata: metadata || {}
    });

    res.status(201).json({
      success: true,
      data: gameSave.toJSON()
    });
  } catch (error) {
    console.error('Error creating game save:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game save',
      message: error.message
    });
  }
});

/**
 * POST /api/games/:id/auto-save - Create an auto-save for a game
 */
router.post('/:id/auto-save', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const { serializedState, metadata } = req.body;

    if (!serializedState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: serializedState'
      });
    }

    const gameSave = GameSave.createAutoSave(game.gameId, serializedState, metadata || {});

    res.status(201).json({
      success: true,
      data: gameSave.toJSON()
    });
  } catch (error) {
    console.error('Error creating auto-save:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create auto-save',
      message: error.message
    });
  }
});

/**
 * GET /api/games/:id - Get specific game by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const game = Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: game.toJSON()
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game',
      message: error.message
    });
  }
});

export default router;
