import NewParty from '../models/NewParty.model.js';

// Create new party
export const createParty = async (req, res) => {
  try {
    const party = new NewParty(req.body);
    await party.save();
    res.status(201).json(party);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all parties
export const getParties = async (req, res) => {
  try {
    const parties = await NewParty.find();
    res.json(parties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get party by ID
export const getPartyById = async (req, res) => {
  try {
    const party = await NewParty.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update party
export const updateParty = async (req, res) => {
  try {
    const party = await NewParty.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json(party);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete party
export const deleteParty = async (req, res) => {
  try {
    const party = await NewParty.findByIdAndDelete(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};