import express from 'express';
import { registerUser, login } from '../controllers/auth.controller.js';

const router = express.Router();

// Authentication Routes
router.post('/register', registerUser);
router.post('/login', login);

export default router;