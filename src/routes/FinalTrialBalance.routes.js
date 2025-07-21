import express from 'express';
const router = express.Router();

import {
  getTrialBalance,
  getPartyBalance,
  updateBalance
} from '../controllers/FinalTrialBalance.controller.js';

// Trial Balance routes
router.get('/', getTrialBalance);
router.get('/party/:partyId', getPartyBalance);
router.put('/update/:partyId', updateBalance);

export default router;
