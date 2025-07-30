const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getNextSrNo,
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties
} = require('../controllers/newParty.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get next SR number
router.get('/next-sr-no', getNextSrNo);

// Get all parties
router.get('/', getAllParties);

// Get party by ID
router.get('/:id', getPartyById);

// Create new party
router.post('/', createParty);

// Update party
router.put('/:id', updateParty);

// Delete party
router.delete('/:id', deleteParty);

// Bulk delete parties
router.delete('/', bulkDeleteParties);

module.exports = router; 