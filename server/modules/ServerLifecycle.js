/**
 * ServerLifecycle - Manages server startup, shutdown, and signal handling
 * Extracted from server startup to improve separation of concerns
 */

export class ServerLifecycle {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.server = null;
    this.shutdownInProgress = false;
  }

  /**
   * Setup graceful shutdown handlers for process signals
   */
  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        if (this.shutdownInProgress) {
          console.log(`Received ${signal} again, forcing exit...`);
          process.exit(1);
        }
        
        console.log(`\nReceived ${signal}. Graceful shutdown...`);
        this.gracefulShutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown(1);
    });
  }

  /**
   * Start the server with proper initialization
   * @param {Object} app - Express application
   * @param {number} port - Port to listen on
   * @returns {Promise<void>}
   */
  async startServer(app, port) {
    try {
      // Initialize database first
      await this.databaseManager.initialize();
      
      // Start periodic cleanup
      this.databaseManager.startPeriodicCleanup();
      
      // Start HTTP server
      this.server = app.listen(port, () => {
        console.log(`Grid Game server running at http://localhost:${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('Database initialized and ready');
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('Failed to start server:', error);
      await this.gracefulShutdown(1);
    }
  }

  /**
   * Perform graceful shutdown
   * @param {number} exitCode - Process exit code (default: 0)
   */
  async gracefulShutdown(exitCode = 0) {
    if (this.shutdownInProgress) {
      return;
    }
    
    this.shutdownInProgress = true;
    
    try {
      console.log('Starting graceful shutdown...');
      
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(() => {
            console.log('HTTP server closed');
            resolve();
          });
        });
      }
      
      // Close database connection
      if (this.databaseManager) {
        this.databaseManager.close();
      }
      
      console.log('Graceful shutdown completed');
      process.exit(exitCode);
      
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get server status information
   * @returns {Object} Server status
   */
  getStatus() {
    return {
      serverRunning: this.server ? true : false,
      databaseInitialized: this.databaseManager ? this.databaseManager.getStatus() : false,
      shutdownInProgress: this.shutdownInProgress
    };
  }

  /**
   * Restart server (for development/maintenance)  
   * @param {Object} app - Express application
   * @param {number} port - Port to listen on
   * @returns {Promise<void>}
   */
  async restart(app, port) {
    console.log('Restarting server...');
    await this.gracefulShutdown(0);
    
    // Reset state
    this.shutdownInProgress = false;
    this.server = null;
    
    // Start again
    await this.startServer(app, port);
  }
}