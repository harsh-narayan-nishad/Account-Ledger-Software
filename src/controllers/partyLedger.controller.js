const LedgerEntry = require('../models/LedgerEntry');
const NewParty = require('../models/NewParty');

// Get all parties for ledger view
const getAllParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status } = req.query;

    // Build query
    const query = { userId };
    
    if (search) {
      query.$or = [
        { partyName: { $regex: search, $options: 'i' } },
        { srNo: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    const parties = await NewParty.find(query)
      .select('partyName srNo status')
      .sort({ partyName: 1 });

    // Transform to match frontend expectations
    const transformedParties = parties.map(party => ({
      name: party.partyName,
      mondayFinal: 'No' // Default value, can be updated based on business logic
    }));

    res.json({
      success: true,
      message: 'Parties retrieved successfully',
      data: transformedParties
    });
  } catch (error) {
    console.error('Get all parties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parties'
    });
  }
};

// Get ledger for specific party
const getPartyLedger = async (req, res) => {
  try {
    const { partyName } = req.params;
    const userId = req.user.id;

    // Get all entries for this party and user
    const entries = await LedgerEntry.find({ 
      partyName: decodeURIComponent(partyName), 
      userId 
    }).sort({ date: 1, createdAt: 1 });

    // Calculate running balance
    let runningBalance = 0;
    const processedEntries = entries.map(entry => {
      if (entry.tnsType === 'CR') {
        runningBalance += entry.credit;
      } else if (entry.tnsType === 'DR') {
        runningBalance -= entry.debit;
      }
      
      return {
        ...entry.toObject(),
        balance: runningBalance
      };
    });

    // Calculate totals
    const totalCredit = entries
      .filter(entry => entry.tnsType === 'CR')
      .reduce((sum, entry) => sum + entry.credit, 0);
    
    const totalDebit = entries
      .filter(entry => entry.tnsType === 'DR')
      .reduce((sum, entry) => sum + entry.debit, 0);

    const calculatedBalance = totalCredit - totalDebit;

    res.json({
      success: true,
      message: 'Ledger retrieved successfully',
      data: {
        ledgerEntries: processedEntries,
        oldRecords: [], // Placeholder for old records
        closingBalance: runningBalance,
        summary: {
          totalCredit,
          totalDebit,
          calculatedBalance,
          totalEntries: entries.length
        }
      }
    });
  } catch (error) {
    console.error('Get party ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ledger'
    });
  }
};

// Add new ledger entry
const addEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName, amount, remarks, tnsType, credit, debit, ti } = req.body;

    // Validate party exists
    const party = await NewParty.findOne({ partyName, userId });
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Create new entry
    const entry = new LedgerEntry({
      partyName,
      date: new Date(),
      remarks,
      tnsType,
      credit: credit || 0,
      debit: debit || 0,
      ti: ti || '',
      userId
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Entry added successfully',
      data: entry
    });
  } catch (error) {
    console.error('Add entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add entry'
    });
  }
};

// Update ledger entry
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const entry = await LedgerEntry.findOne({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    const updatedEntry = await LedgerEntry.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Entry updated successfully',
      data: updatedEntry
    });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update entry'
    });
  }
};

// Delete ledger entry
const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const entry = await LedgerEntry.findOne({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    await LedgerEntry.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Entry deleted successfully',
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry'
    });
  }
};

// Update Monday Final status for parties
const updateMondayFinal = async (req, res) => {
  try {
    const { partyNames } = req.body;
    const userId = req.user.id;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    // Update Monday Final status for all entries of these parties
    const result = await LedgerEntry.updateMany(
      { 
        partyName: { $in: partyNames }, 
        userId,
        mondayFinal: 'No'
      },
      { mondayFinal: 'Yes' }
    );

    res.json({
      success: true,
      message: 'Monday Final status updated successfully',
      data: { updated: result.modifiedCount }
    });
  } catch (error) {
    console.error('Update Monday Final error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Monday Final status'
    });
  }
};

// Delete multiple parties
const deleteParties = async (req, res) => {
  try {
    const { partyNames } = req.body;
    const userId = req.user.id;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    // Delete all ledger entries for these parties
    const entriesResult = await LedgerEntry.deleteMany({
      partyName: { $in: partyNames },
      userId
    });

    // Delete the parties themselves
    const partiesResult = await NewParty.deleteMany({
      partyName: { $in: partyNames },
      userId
    });

    res.json({
      success: true,
      message: 'Parties and their entries deleted successfully',
      data: { 
        deletedEntries: entriesResult.deletedCount,
        deletedParties: partiesResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Delete parties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete parties'
    });
  }
};

module.exports = {
  getAllParties,
  getPartyLedger,
  addEntry,
  updateEntry,
  deleteEntry,
  updateMondayFinal,
  deleteParties
}; 