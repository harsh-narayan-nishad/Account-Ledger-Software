import express from 'express';
const router = express.Router();

// Import controllers (we'll create these next)
import { 
  createParty,
  getParties,
  getPartyById,
  updateParty,
  deleteParty 
} from '../controllers/newParty.controller.js';

// Party routes
router.post('/', createParty);
router.get('/', getParties);
router.get('/:id', getPartyById);
router.put('/:id', updateParty);
router.delete('/:id', deleteParty);

export default router;
