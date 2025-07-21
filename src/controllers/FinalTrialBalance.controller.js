import FinalTrialBalance from '../models/FinalTrialBalance.model.js';

// Get trial balance
export const getTrialBalance = async (req, res) => {
  try {
    const balance = await FinalTrialBalance.find()
      .populate('partyId', 'partyName')
      .sort({ date: -1 });
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get party balance
export const getPartyBalance = async (req, res) => {
  try {
    const balance = await FinalTrialBalance.findOne({ partyId: req.params.partyId })
      .populate('partyId', 'partyName');
    
    if (!balance) {
      return res.status(404).json({ message: 'Balance not found for this party' });
    }
    
    res.json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update balance
export const updateBalance = async (req, res) => {
  try {
    const balance = await FinalTrialBalance.findOneAndUpdate(
      { partyId: req.params.partyId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!balance) {
      return res.status(404).json({ message: 'Balance not found for this party' });
    }

    res.json(balance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
