import express from 'express';
import gamesRouter from './api/games.js';
import playersRouter from './api/players.js';
import savesRouter from './api/saves.js';
import dbConnection from '../database/connection.js';
import healthMonitor from '../modules/HealthMonitor.js';
import logger from '../modules/Logger.js';

const router = express.Router();

// Mount API routes
router.use('/api/games', gamesRouter);
router.use('/api/players', playersRouter);
router.use('/api/saves', savesRouter);

// Health check endpoints
router.get('/api/health', async (req, res) => {
  try {
    const health = await healthMonitor.getBasicHealth();
    const statusCode = health.success ? 200 : 503;
    
    logger.api('Health check requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status: health.status
    });
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', { 
      error: error.message, 
      stack: error.stack,
      ip: req.ip 
    });
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health and metrics endpoint
router.get('/api/health/detailed', async (req, res) => {
  try {
    const health = await healthMonitor.getHealthStatus();
    const statusCode = health.success ? 200 : 503;
    
    logger.api('Detailed health check requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status: health.status
    });
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check failed', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip 
    });
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Security metrics endpoint
router.get('/api/health/security', async (req, res) => {
  try {
    const health = await healthMonitor.getHealthStatus();
    
    logger.api('Security metrics requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      security: health.security
    });
  } catch (error) {
    logger.error('Security metrics check failed', { 
      error: error.message,
      ip: req.ip 
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
router.get('/api/health/performance', async (req, res) => {
  try {
    const health = await healthMonitor.getHealthStatus();
    
    logger.api('Performance metrics requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      performance: health.performance,
      system: health.system
    });
  } catch (error) {
    logger.error('Performance metrics check failed', { 
      error: error.message,
      ip: req.ip 
    });
    
    res.status(500).json({
      success: false,
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
