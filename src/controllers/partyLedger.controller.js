const LedgerEntry = require('../models/LedgerEntry');
const NewParty = require('../models/NewParty');

// Enhanced business logic functions
const calculateBalance = (entries) => {
  let runningBalance = 0;
  return entries.map(entry => {
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
};

const calculateSummary = (entries) => {
  const totalCredit = entries
    .filter(entry => entry.tnsType === 'CR')
    .reduce((sum, entry) => sum + entry.credit, 0);
  
  const totalDebit = entries
    .filter(entry => entry.tnsType === 'DR')
    .reduce((sum, entry) => sum + entry.debit, 0);

  return {
    totalCredit,
    totalDebit,
    calculatedBalance: totalCredit - totalDebit,
    totalEntries: entries.length
  };
};

const generateMondayFinalData = (entries, startingBalance = 0) => {
  const selectedEntries = entries.filter(entry => entry.chk);
  const summary = calculateSummary(selectedEntries);
  
  return {
    transactionCount: selectedEntries.length,
    totalCredit: summary.totalCredit,
    totalDebit: summary.totalDebit,
    startingBalance,
    finalBalance: startingBalance + summary.calculatedBalance
  };
};

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

    // Get Monday Final status for each party
    const partiesWithMondayFinal = await Promise.all(
      parties.map(async (party) => {
        const lastEntry = await LedgerEntry.findOne({
          partyName: party.partyName,
          userId,
          tnsType: 'Monday S...'
        }).sort({ date: -1 });

        return {
          name: party.partyName,
          srNo: party.srNo,
          status: party.status,
          mondayFinal: lastEntry ? 'Yes' : 'No'
        };
      })
    );

    res.json({
      success: true,
      message: 'Parties retrieved successfully',
      data: partiesWithMondayFinal
    });
  } catch (error) {
    console.error('Get all parties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parties'
    });
  }
};

// Get ledger for specific party with enhanced calculations
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
    const processedEntries = calculateBalance(entries);
    const summary = calculateSummary(entries);

    // Get old records (entries before last Monday Final)
    const lastMondayFinal = entries
      .filter(entry => entry.tnsType === 'Monday S...')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const oldRecords = lastMondayFinal 
      ? entries.filter(entry => new Date(entry.date) < new Date(lastMondayFinal.date))
      : [];

    res.json({
      success: true,
      message: 'Ledger retrieved successfully',
      data: {
        ledgerEntries: processedEntries,
        oldRecords: calculateBalance(oldRecords),
        closingBalance: summary.calculatedBalance,
        summary,
        mondayFinalData: generateMondayFinalData(processedEntries, summary.calculatedBalance)
      }
    });
  } catch (error) {
    console.error('Get party ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get party ledger'
    });
  }
};

// Add new ledger entry with enhanced validation
const addEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName, amount, remarks, tnsType } = req.body;

    // Validation
    if (!partyName || !amount || !remarks) {
      return res.status(400).json({
        success: false,
        message: 'Party name, amount, and remarks are required'
      });
    }

    // Validate amount is positive
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Check if party exists
    const party = await NewParty.findOne({ partyName, userId });
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Calculate credit/debit based on transaction type
    let credit = 0;
    let debit = 0;
    
    if (tnsType === 'CR') {
      credit = parsedAmount;
    } else if (tnsType === 'DR') {
      debit = parsedAmount;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be CR or DR'
      });
    }

    // Get current date in DD/MM/YYYY format
    const today = new Date();
    const date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    // Generate transaction ID
    const ti = `${Date.now()}:`;

    const newEntry = new LedgerEntry({
      partyName,
      date,
      remarks,
      tnsType,
      credit,
      debit,
      balance: 0, // Will be calculated by frontend
      chk: false,
      ti,
      userId
    });

    await newEntry.save();

    // Get updated ledger with recalculated balances
    const updatedEntries = await LedgerEntry.find({ 
      partyName, 
      userId 
    }).sort({ date: 1, createdAt: 1 });

    const processedEntries = calculateBalance(updatedEntries);
    const summary = calculateSummary(updatedEntries);

    res.json({
      success: true,
      message: 'Entry added successfully',
      data: {
        entry: newEntry,
        updatedLedger: processedEntries,
        summary
      }
    });
  } catch (error) {
    console.error('Add entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add entry'
    });
  }
};

// Update ledger entry with enhanced validation
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { remarks, amount, tnsType } = req.body;

    const entry = await LedgerEntry.findOne({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Update fields
    if (remarks !== undefined) entry.remarks = remarks;
    if (amount !== undefined) {
      if (tnsType === 'CR') {
        entry.credit = parseFloat(amount);
        entry.debit = 0;
      } else if (tnsType === 'DR') {
        entry.debit = parseFloat(amount);
        entry.credit = 0;
      }
    }
    if (tnsType !== undefined) entry.tnsType = tnsType;

    await entry.save();

    // Recalculate balances for all entries
    const allEntries = await LedgerEntry.find({ 
      partyName: entry.partyName, 
      userId 
    }).sort({ date: 1, createdAt: 1 });

    const processedEntries = calculateBalance(allEntries);
    const summary = calculateSummary(allEntries);

    res.json({
      success: true,
      message: 'Entry updated successfully',
      data: {
        entry,
        updatedLedger: processedEntries,
        summary
      }
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

    // Recalculate balances for remaining entries
    const remainingEntries = await LedgerEntry.find({ 
      partyName: entry.partyName, 
      userId 
    }).sort({ date: 1, createdAt: 1 });

    const processedEntries = calculateBalance(remainingEntries);
    const summary = calculateSummary(remainingEntries);

    res.json({
      success: true,
      message: 'Entry deleted successfully',
      data: {
        updatedLedger: processedEntries,
        summary
      }
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entry'
    });
  }
};

// Enhanced Monday Final settlement with business logic
const updateMondayFinal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    const results = [];

    for (const partyName of partyNames) {
      // Get all entries for this party
      const entries = await LedgerEntry.find({ 
        partyName, 
        userId 
      }).sort({ date: 1, createdAt: 1 });

      // Get selected entries (checked ones)
      const selectedEntries = entries.filter(entry => entry.chk);
      
      if (selectedEntries.length === 0) {
        results.push({
          partyName,
          success: false,
          message: 'No entries selected for settlement'
        });
        continue;
      }

      // Calculate settlement data
      const summary = calculateSummary(selectedEntries);
      const today = new Date();
      const date = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

      // Create Monday Final settlement entry
      const settlementEntry = new LedgerEntry({
        partyName,
        date,
        remarks: `Monday Final ${date} - ${selectedEntries.length} entries`,
        tnsType: 'Monday S...',
        credit: summary.totalCredit,
        debit: summary.totalDebit,
        balance: summary.calculatedBalance,
        chk: false,
        ti: `${Date.now()}:`,
        userId
      });

      await settlementEntry.save();

      // Uncheck all selected entries
      await LedgerEntry.updateMany(
        { _id: { $in: selectedEntries.map(e => e._id) } },
        { chk: false }
      );

      results.push({
        partyName,
        success: true,
        message: 'Monday Final settlement completed',
        data: {
          settlementEntry,
          summary
        }
      });
    }

    res.json({
      success: true,
      message: 'Monday Final settlements processed',
      data: results
    });
  } catch (error) {
    console.error('Monday Final error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Monday Final settlements'
    });
  }
};

// Delete multiple parties with cleanup
const deleteParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyNames } = req.body;

    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    // Delete parties
    const deletePartyResult = await NewParty.deleteMany({
      partyName: { $in: partyNames },
      userId
    });

    // Delete associated ledger entries
    const deleteLedgerResult = await LedgerEntry.deleteMany({
      partyName: { $in: partyNames },
      userId
    });

    res.json({
      success: true,
      message: 'Parties and associated data deleted successfully',
      data: {
        deletedParties: deletePartyResult.deletedCount,
        deletedEntries: deleteLedgerResult.deletedCount
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