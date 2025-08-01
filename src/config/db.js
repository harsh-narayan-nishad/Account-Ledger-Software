/**
 * Database Configuration
 * 
 * Configures MongoDB connection for the Account Ledger Software backend.
 * Handles database connection, error handling, and connection events.
 * 
 * Features:
 * - MongoDB connection setup with optimized settings
 * - Connection event handling
 * - Error logging and monitoring
 * - Connection retry logic
 * - Environment-based configuration
 * - Performance optimization
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use MONGO_URI for Render, fallback to MONGODB_URI
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Minimal connection options for fastest startup
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Minimal settings for fastest startup
      serverSelectionTimeoutMS: 2000, // Very short timeout
      socketTimeoutMS: 15000, // Short socket timeout
      // Minimal connection pool
      maxPoolSize: 2, // Very small pool for free tier
      minPoolSize: 1, // Minimum connections
      // Fast write concern
      w: 1,
      j: false
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 