/**
 * Party Ledger Routes
 * 
 * Defines API endpoints for party ledger management and transactions
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - GET /parties - Get all parties for ledger view
 * - GET /:partyName - Get ledger entries for specific party
 * - POST /entry - Add new ledger entry
 * - PUT /entry/:id - Update ledger entry
 * - DELETE /entry/:id - Delete ledger entry
 * - PUT /monday-final - Process Monday Final settlement
 * - DELETE /parties - Delete multiple parties
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getAllParties,
  getPartyLedger,
  addEntry,
  updateEntry,
  deleteEntry,
  updateMondayFinal,
  deleteParties
} = require('../controllers/partyLedger.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all parties for ledger
router.get('/parties', getAllParties);

// Get ledger for specific party
router.get('/:partyName', getPartyLedger);

// Add new ledger entry
router.post('/entry', addEntry);

// Update ledger entry
router.put('/entry/:id', updateEntry);

// Delete ledger entry
router.delete('/entry/:id', deleteEntry);

// Update Monday Final status
router.put('/monday-final', updateMondayFinal);

// Delete multiple parties
router.delete('/parties', deleteParties);

module.exports = router; 