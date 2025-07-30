const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings
} = require('../controllers/userSettings.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get user settings
router.get('/:userId', getUserSettings);

// Create user settings
router.post('/', createUserSettings);

// Update user settings
router.put('/:userId', updateUserSettings);

// Delete user settings
router.delete('/:userId', deleteUserSettings);

module.exports = router; 