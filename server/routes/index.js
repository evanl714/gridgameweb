import express from 'express';
import gamesRouter from './api/games.js';
import playersRouter from './api/players.js';
import savesRouter from './api/saves.js';
import dbConnection from '../database/connection.js';

const router = express.Router();

// Mount API routes
router.use('/api/games', gamesRouter);
router.use('/api/players', playersRouter);
router.use('/api/saves', savesRouter);

// Health check endpoint
router.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const db = dbConnection.getDatabase();
        const result = db.prepare('SELECT 1 as test').get();
        
        // Get basic stats
        const stats = dbConnection.getStats();
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: !!result,
                stats
            }
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Database management endpoints
router.get('/api/database/stats', async (req, res) => {
    try {
        const stats = dbConnection.getStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching database stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch database statistics',
            message: error.message
        });
    }
});

router.post('/api/database/cleanup', async (req, res) => {
    try {
        const results = dbConnection.cleanup();
        
        res.json({
            success: true,
            message: 'Database cleanup completed',
            data: results
        });
    } catch (error) {
        console.error('Error during database cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup database',
            message: error.message
        });
    }
});

router.post('/api/database/validate', async (req, res) => {
    try {
        const isValid = dbConnection.validateIntegrity();
        
        res.json({
            success: true,
            data: {
                isValid,
                message: isValid ? 'Database integrity is valid' : 'Database integrity check failed'
            }
        });
    } catch (error) {
        console.error('Error validating database:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate database',
            message: error.message
        });
    }
});

// Generic error handler for API routes
router.use('/api/*', (error, req, res, next) => {
    console.error('API Error:', error);
    
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// 404 handler for API routes
router.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.originalUrl
    });
});

export default router;