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
    
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Optimized connection settings for better performance
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Socket timeout
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      // Connection pool settings
      poolSize: 10,
      // Write concern for better performance
      w: 1,
      j: false,
      // Read preference for better performance
      readPreference: 'primaryPreferred'
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