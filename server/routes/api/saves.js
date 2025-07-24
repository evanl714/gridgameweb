import express from 'express';
import { GameSave } from '../../models/index.js';

const router = express.Router();

/**
 * GET /api/saves - Get saves by type or all saves
 */
router.get('/', async (req, res) => {
    try {
        const { type, limit } = req.query;
        
        let saves;
        if (type) {
            saves = GameSave.findByType(type, parseInt(limit) || 50);
        } else {
            // Get all saves with basic pagination
            const limitNum = parseInt(limit) || 50;
            saves = GameSave.findByType('manual', limitNum)
                .concat(GameSave.findByType('auto', limitNum))
                .concat(GameSave.findByType('checkpoint', limitNum))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, limitNum);
        }
        
        res.json({
            success: true,
            data: saves.map(save => save.toJSON())
        });
    } catch (error) {
        console.error('Error fetching saves:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch saves',
            message: error.message
        });
    }
});

/**
 * GET /api/saves/stats - Get save statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = GameSave.getStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching save stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch save statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/saves/:id - Get specific save by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const save = GameSave.findById(req.params.id);
        
        if (!save) {
            return res.status(404).json({
                success: false,
                error: 'Save not found'
            });
        }

        res.json({
            success: true,
            data: save.toJSON()
        });
    } catch (error) {
        console.error('Error fetching save:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch save',
            message: error.message
        });
    }
});

/**
 * POST /api/saves - Create a new save
 */
router.post('/', async (req, res) => {
    try {
        const { gameId, serializedState, saveName, saveType, metadata } = req.body;

        if (!gameId || !serializedState) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: gameId, serializedState'
            });
        }

        const save = GameSave.create(gameId, serializedState, {
            saveName,
            saveType: saveType || 'manual',
            metadata: metadata || {}
        });

        res.status(201).json({
            success: true,
            data: save.toJSON()
        });
    } catch (error) {
        console.error('Error creating save:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create save',
            message: error.message
        });
    }
});

/**
 * POST /api/saves/auto-save - Create an auto-save
 */
router.post('/auto-save', async (req, res) => {
    try {
        const { gameId, serializedState, metadata } = req.body;

        if (!gameId || !serializedState) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: gameId, serializedState'
            });
        }

        const save = GameSave.createAutoSave(gameId, serializedState, metadata || {});

        res.status(201).json({
            success: true,
            data: save.toJSON()
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
 * DELETE /api/saves/:id - Delete a save
 */
router.delete('/:id', async (req, res) => {
    try {
        const save = GameSave.findById(req.params.id);
        
        if (!save) {
            return res.status(404).json({
                success: false,
                error: 'Save not found'
            });
        }

        const deleted = save.delete();

        if (deleted) {
            res.json({
                success: true,
                message: 'Save deleted successfully'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to delete save'
            });
        }
    } catch (error) {
        console.error('Error deleting save:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete save',
            message: error.message
        });
    }
});

/**
 * POST /api/saves/cleanup - Clean up old auto-saves
 */
router.post('/cleanup', async (req, res) => {
    try {
        const { daysToKeep } = req.body;
        const days = parseInt(daysToKeep) || 7;
        
        const deletedCount = GameSave.cleanupOldAutoSaves(days);

        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} old auto-saves`,
            deletedCount
        });
    } catch (error) {
        console.error('Error cleaning up saves:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup saves',
            message: error.message
        });
    }
});

export default router;