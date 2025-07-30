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