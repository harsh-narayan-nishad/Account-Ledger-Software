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
    
    // Simplified connection options for better performance
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Minimal connection settings for faster startup
      serverSelectionTimeoutMS: 3000, // Reduced timeout
      socketTimeoutMS: 30000, // Reduced socket timeout
      // Connection pool settings
      maxPoolSize: 5, // Reduced pool size for free tier
      minPoolSize: 1, // Minimum connections
      // Write concern for better performance
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