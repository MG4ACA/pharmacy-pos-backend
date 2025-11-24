import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

// Import configurations
import { corsOptions } from './config/cors.js';
import sequelize, { testConnection } from './config/database.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';

// Import routes
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Get configuration from environment
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Middleware Setup
 */

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(logger());

/**
 * Routes
 */
app.use('/api', routes);

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Pharmacy POS Backend API',
    version: '1.0.0',
    environment: NODE_ENV,
    documentation: '/api',
  });
});

/**
 * Error Handling
 */

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

/**
 * Database Connection & Server Startup
 */
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Connecting to database...');
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error('❌ Failed to connect to database');
      console.error('Please check your database configuration in .env file');
      process.exit(1);
    }

    // Sync database (only in development)
    if (NODE_ENV === 'development') {
      console.log('🔄 Syncing database models...');
      await sequelize.sync({ alter: false }); // Set to true to auto-update tables
      console.log('✓ Database models synced');
    }

    // Start server
    app.listen(PORT, HOST, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Pharmacy POS Backend API Server Started!');
      console.log('='.repeat(60));
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
      console.log(`📚 API Endpoint: http://${HOST}:${PORT}/api`);
      console.log(`💓 Health Check: http://${HOST}:${PORT}/api/health`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}`);
      console.log('='.repeat(60));
      console.log('');
      console.log('✓ Server is ready to accept connections');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful Shutdown
 */
const gracefulShutdown = async () => {
  console.log('\n⏳ Received shutdown signal, closing server gracefully...');

  try {
    // Close database connection
    await sequelize.close();
    console.log('✓ Database connection closed');

    console.log('✓ Server shut down complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start the server
startServer();

export default app;
