/**
 * Account Ledger Software - Backend Server
 * 
 * This is the main server file for the Account Ledger Software backend API.
 * It handles all HTTP requests, middleware configuration, and route management.
 * 
 * Features:
 * - RESTful API endpoints for ledger management
 * - Authentication and authorization
 * - Rate limiting and security
 * - Compression and performance optimization
 * - MongoDB database integration
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Core dependencies
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

// Database and route imports
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const newPartyRoutes = require('./src/routes/newParty.routes');
const partyLedgerRoutes = require('./src/routes/partyLedger.routes');
const finalTrialBalanceRoutes = require('./src/routes/FinalTrialBalance.routes');
const userSettingsRoutes = require('./src/routes/userSettings.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Trust Proxy Configuration
 * 
 * Configure Express to trust the proxy headers from Render.
 * This is required for proper rate limiting behind a proxy.
 */
app.set('trust proxy', 1);

/**
 * Mongoose Configuration
 * 
 * Configure mongoose settings to prevent deprecation warnings
 * and optimize for performance.
 */
mongoose.set('strictQuery', false);

/**
 * Performance Monitoring Middleware
 * 
 * Logs request processing time for performance analysis.
 * Only logs in development or for specific endpoints.
 */
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isLoginEndpoint = req.path.includes('/login');
    const isHealthEndpoint = req.path === '/health';
    
    // Log performance for login and health endpoints
    if (isLoginEndpoint || isHealthEndpoint) {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    }
  });
  
  next();
};

/**
 * Database Connection
 * 
 * Establishes connection to MongoDB database using Mongoose.
 * Handles connection events and error logging.
 */
connectDB();

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Enables cross-origin requests from the frontend application.
 * Configures allowed origins, methods, and headers for security.
 * Must be applied before Helmet to ensure proper header handling.
 */
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://property-flow-design.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

/**
 * Security Middleware Configuration
 * 
 * Helmet provides various HTTP headers to help protect the app
 * from well-known web vulnerabilities.
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  // Reduced security headers for faster processing
  contentSecurityPolicy: false,
  hsts: false
}));

/**
 * Preflight Request Handler
 * 
 * Handles OPTIONS requests for CORS preflight checks.
 * Ensures proper CORS headers are sent for all preflight requests.
 */
app.options('*', cors());

/**
 * Additional CORS Headers Middleware
 * 
 * Ensures CORS headers are properly set for all responses.
 * This is a backup to the main CORS middleware.
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://property-flow-design.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

/**
 * Performance Monitoring
 * 
 * Add performance monitoring before other middleware
 */
app.use(performanceMonitor);

/**
 * Compression Middleware Configuration
 * 
 * Compresses response bodies for all requests that pass through the middleware.
 * Uses aggressive compression settings for optimal performance:
 * - Level 4: Reduced compression for faster processing
 * - Threshold: Only compress responses larger than 2KB
 * - Filter: Skip compression for specific headers
 */
app.use(compression({
  level: 2, // Further reduced compression level for faster processing
  threshold: 4096, // Increased threshold
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

/**
 * Rate Limiting Configuration
 * 
 * Limits the number of requests per IP address to prevent abuse.
 * Configurable through environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 15 minutes)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 200)
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // Increased limit for better performance
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  // Fix for proxy headers
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});
app.use('/api/', limiter);

/**
 * Body Parsing Middleware Configuration
 * 
 * Parses incoming request bodies and makes them available in req.body.
 * Optimized settings for performance and security:
 * - JSON parsing with 5MB limit and strict mode
 * - URL-encoded parsing with extended mode
 * - Parameter limit to prevent abuse
 */
app.use(express.json({ 
  limit: '2mb', // Reduced limit for faster processing
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '2mb', // Reduced limit
  parameterLimit: 500 // Reduced parameter limit
}));

/**
 * Logging Middleware Configuration
 * 
 * Logs HTTP requests in development environment only.
 * Uses 'combined' format for detailed request logging.
 * Disabled in production for performance optimization.
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

/**
 * Health Check Endpoint
 * 
 * Provides server status information for monitoring and deployment checks.
 * Returns server uptime, environment, and timestamp.
 * Used by deployment platforms to verify server health.
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

/**
 * API Route Configuration
 * 
 * Mounts all API routes with their respective prefixes.
 * Each route module handles specific functionality:
 * - /api/authentication: User login, registration, profile management
 * - /api/new-party: Party creation and management
 * - /api/party-ledger: Ledger entries and transactions
 * - /api/final-trial-balance: Trial balance reports
 * - /api/settings: User settings and preferences
 * - /api/dashboard: Dashboard statistics and analytics
 */
app.use('/api/authentication', authRoutes);
app.use('/api/new-party', newPartyRoutes);
app.use('/api/party-ledger', partyLedgerRoutes);
app.use('/api/final-trial-balance', finalTrialBalanceRoutes);
app.use('/api/settings', userSettingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

/**
 * 404 Error Handler
 * 
 * Catches all unmatched routes and returns a 404 error.
 * This middleware should be placed after all other routes.
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

/**
 * Global Error Handler
 * 
 * Centralized error handling for all application errors.
 * Handles different types of errors with appropriate HTTP status codes:
 * - ValidationError: Mongoose validation errors (400)
 * - CastError: Invalid MongoDB ObjectId format (400)
 * - DuplicateKeyError: MongoDB duplicate key errors (400)
 * - Generic errors: Internal server error (500)
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

/**
 * Server Startup
 * 
 * Starts the Express server on the specified port.
 * Logs server startup information and handles startup errors.
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 