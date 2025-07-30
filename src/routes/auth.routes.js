const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/auth.controller');

// Public routes
router.post('/register/user', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

module.exports = router; 