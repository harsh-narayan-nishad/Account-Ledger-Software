/**
 * Keep-Alive Script for Render Free Tier
 * 
 * This script prevents the server from going to sleep by making
 * periodic requests to the health endpoint.
 * 
 * Features:
 * - Automatic health check every 10 minutes
 * - Prevents cold start delays
 * - Lightweight and efficient
 * - Error handling and logging
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const https = require('https');
const http = require('http');

// Server URL (replace with your actual Render URL)
const SERVER_URL = 'https://account-ledger-software-9sys.onrender.com';

/**
 * Makes a health check request to keep the server alive
 */
const keepAlive = async () => {
  try {
    const url = `${SERVER_URL}/health`;
    const protocol = url.startsWith('https') ? https : http;
    
    const response = await new Promise((resolve, reject) => {
      const req = protocol.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
    
    console.log(`✅ Keep-alive successful: ${response.status} - ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`❌ Keep-alive failed: ${error.message} - ${new Date().toISOString()}`);
  }
};

/**
 * Starts the keep-alive process
 */
const startKeepAlive = () => {
  console.log('🔄 Starting keep-alive process...');
  
  // Initial health check
  keepAlive();
  
  // Set up periodic health checks (every 10 minutes)
  setInterval(keepAlive, 10 * 60 * 1000);
  
  console.log('✅ Keep-alive process started successfully');
};

// Start the keep-alive process
startKeepAlive(); 