import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dbConnection from './database/connection.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' })); // Increase limit for large game states
app.use(express.urlencoded({ extended: true }));

// CORS for development (remove in production)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });
}

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// API routes
app.use('/', routes);

// Serve the main game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler for non-API routes (serve game page for SPA routing)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(error.status || 500).json({
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        console.log('Initializing database...');
        await dbConnection.initialize('./game.db');
        
        // Validate database integrity
        const isValid = dbConnection.validateIntegrity();
        if (!isValid) {
            throw new Error('Database integrity check failed');
        }
        
        // Start server
        app.listen(port, () => {
            console.log(`Grid Game server running at http://localhost:${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('Database initialized and ready');
            
            // Schedule periodic database cleanup (every hour)
            setInterval(() => {
                try {
                    const results = dbConnection.cleanup();
                    if (results.expiredSessions > 0 || results.oldGames > 0 || results.oldAutoSaves > 0) {
                        console.log('Periodic database cleanup:', results);
                    }
                } catch (error) {
                    console.error('Periodic cleanup failed:', error);
                }
            }, 60 * 60 * 1000); // 1 hour
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Graceful shutdown...');
    dbConnection.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Graceful shutdown...');
    dbConnection.close();
    process.exit(0);
});

// Start the server
startServer();
