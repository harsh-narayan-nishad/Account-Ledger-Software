/**
 * Dashboard Routes
 * 
 * API routes for dashboard statistics and analytics.
 * Provides real-time data for the dashboard interface.
 * 
 * Features:
 * - Dashboard statistics endpoint
 * - Analytics and reporting
 * - Real-time data aggregation
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth');

/**
 * GET /api/dashboard/stats
 * 
 * Retrieves dashboard statistics including:
 * - Total parties count
 * - Total transactions count
 * - Total balance
 * - Settlement statistics
 * - Growth metrics
 * 
 * @requires Authentication
 * @returns {Object} Dashboard statistics
 */
router.get('/stats', auth, getDashboardStats);

module.exports = router; 