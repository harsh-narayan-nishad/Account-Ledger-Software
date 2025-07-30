const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getFinalTrialBalance,
  getPartyBalance,
  generateReport
} = require('../controllers/FinalTrialBalance.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get final trial balance
router.get('/', getFinalTrialBalance);

// Get trial balance for specific party
router.get('/party/:partyName', getPartyBalance);

// Generate trial balance report
router.post('/report', generateReport);

module.exports = router; 