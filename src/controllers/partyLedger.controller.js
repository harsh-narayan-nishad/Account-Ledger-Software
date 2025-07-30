/**
 * Party Ledger Controller
 * 
 * Handles all party ledger operations including:
 * - Adding, updating, and deleting ledger entries
 * - Calculating running balances and summaries
 * - Monday Final settlement processing
 * - Party management and cleanup
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

// Import required models
const LedgerEntry = require('../models/LedgerEntry');
const NewParty = require('../models/NewParty');

/**
 * Enhanced Business Logic Functions
 * 
 * These functions handle core business calculations for the ledger system.
 * They are optimized for performance and accuracy.
 */

/**
 * Calculate Running Balance for Ledger Entries
 * 
 * Processes an array of ledger entries and calculates the running balance
 * for each entry based on credit and debit amounts.
 * 
 * @param {Array} entries - Array of ledger entry objects
 * @returns {Array} - Array of entries with calculated running balances
 */
const calculateBalance = (entries) => {
  let runningBalance = 0;
  return entries.map(entry => {
    if (entry.tnsType === 'CR') {
      runningBalance += entry.credit;
    } else if (entry.tnsType === 'DR') {
      runningBalance -= entry.debit;
    } else if (entry.tnsType === 'Monday Settlement') {
      // Monday Final should show the actual settlement balance
      runningBalance = entry.balance; // Use the balance from the Monday Final entry
    }
    return {
      ...entry,
      balance: runningBalance
    };
  });
};

/**
 * Calculate Summary Statistics for Ledger Entries
 * 
 * Calculates total credit, debit, and balance for a set of ledger entries.
 * Used for generating summary reports and Monday Final settlements.
 * 
 * @param {Array} entries - Array of ledger entry objects
 * @returns {Object} - Summary object with totals and entry count
 */
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

/**
 * Generate Monday Final Settlement Data
 * 
 * Creates settlement data for Monday Final processing.
 * Calculates transaction counts and balances for selected entries.
 * 
 * @param {Array} entries - Array of ledger entry objects
 * @param {number} startingBalance - Starting balance for calculations
 * @returns {Object} - Monday Final data with transaction details
 */
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

/**
 * Fix Old Monday Final Entries in Database
 * 
 * Updates old Monday Final entries in the database to use correct logic.
 * This function can be called to fix historical data.
 * 
 * @param {string} userId - User ID to fix entries for
 * @returns {Promise<Object>} - Result of the fix operation
 */
const fixOldMondayFinalEntries = async (userId) => {
  try {
    // Find all old Monday Final entries with wrong logic
    const oldEntries = await LedgerEntry.find({
      userId,
      tnsType: 'Monday Settlement',
      credit: { $gt: 0 },
      debit: 0
    });

    console.log(`Found ${oldEntries.length} old Monday Final entries to fix`);

    // Update each entry to use correct logic
    const updatePromises = oldEntries.map(async (entry) => {
      return await LedgerEntry.findByIdAndUpdate(
        entry._id,
        {
          $set: {
            credit: 0,
            debit: entry.credit, // Move credit to debit
            balance: 0
          }
        },
        { new: true }
      );
    });

    const updatedEntries = await Promise.all(updatePromises);
    
    // Also find and delete Monday Final entries with empty credit and debit
    const emptyEntries = await LedgerEntry.find({
      userId,
      tnsType: 'Monday Settlement',
      credit: 0,
      debit: 0
    });

    console.log(`Found ${emptyEntries.length} empty Monday Final entries to delete`);

    if (emptyEntries.length > 0) {
      await LedgerEntry.deleteMany({
        userId,
        tnsType: 'Monday Settlement',
        credit: 0,
        debit: 0
      });
    }
    
    return {
      success: true,
      message: `Fixed ${updatedEntries.length} old Monday Final entries and deleted ${emptyEntries.length} empty entries`,
      fixedCount: updatedEntries.length,
      deletedCount: emptyEntries.length
    };
  } catch (error) {
    console.error('Fix old Monday Final entries error:', error);
    return {
      success: false,
      message: 'Failed to fix old Monday Final entries',
      error: error.message
    };
  }
};

/**
 * Get All Parties for Ledger View
 * 
 * Retrieves all parties for the current user with optional filtering.
 * Supports search by party name or SR number, and status filtering.
 * Includes Monday Final status for each party.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with parties data
 */
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
          tnsType: 'Monday Settlement'
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

    // Fix old Monday Final entries in database for this user
    await fixOldMondayFinalEntries(userId);

    // Get all entries for this party and user with optimized query
    const entries = await LedgerEntry.find({ 
      partyName: decodeURIComponent(partyName), 
      userId 
    })
    .select('partyName date remarks tnsType credit debit balance chk ti userId')
    .sort({ date: 1, createdAt: 1 })
    .lean(); // Use lean() for better performance

    // Find the last Monday Final settlement
    const lastMondayFinal = entries
      .filter(entry => entry.tnsType === 'Monday Settlement')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    // Get entries to show in the ledger
    let ledgerEntries = [];
    if (lastMondayFinal) {
      // Show only the last Monday Final and transactions after it
      ledgerEntries = entries.filter(entry => 
        entry._id.toString() === lastMondayFinal._id.toString() ||
        new Date(entry.date) > new Date(lastMondayFinal.date)
      );
    } else {
      // If no Monday Final exists, show all entries
      ledgerEntries = entries;
    }

    // Calculate running balance for visible entries
    const processedEntries = calculateBalance(ledgerEntries);
    
    // Recalculate summary after fixing Monday Final entries
    const summary = calculateSummary(processedEntries);

    // Get old records (entries before last Monday Final) for reference
    const oldRecords = lastMondayFinal 
      ? entries.filter(entry => new Date(entry.date) < new Date(lastMondayFinal.date))
      : [];

    // Fix old Monday Final entries in the response to show correct logic
    const fixedProcessedEntries = processedEntries.map(entry => {
      if (entry.tnsType === 'Monday Settlement') {
        // Check if this is an old entry with wrong logic
        if (entry.credit > 0 && entry.debit === 0) {
          // This is an old Monday Final with wrong logic, fix it
          return {
            ...entry,
            credit: 0,
            debit: entry.credit, // Move credit to debit
            balance: 0
          };
        }
      }
      return entry;
    });

    // Fix old records as well to show correct logic
    const fixedOldRecords = oldRecords.map(entry => {
      if (entry.tnsType === 'Monday Settlement') {
        // Check if this is an old entry with wrong logic
        if (entry.credit > 0 && entry.debit === 0) {
          // This is an old Monday Final with wrong logic, fix it
          return {
            ...entry,
            credit: 0,
            debit: entry.credit, // Move credit to debit
            balance: 0
          };
        }
      }
      return entry;
    });

    res.json({
      success: true,
      message: 'Ledger retrieved successfully',
      data: {
        ledgerEntries: fixedProcessedEntries,
        oldRecords: calculateBalance(fixedOldRecords),
        closingBalance: summary.calculatedBalance,
        summary,
        mondayFinalData: generateMondayFinalData(fixedProcessedEntries, summary.calculatedBalance)
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
    const { partyName, amount, remarks, tnsType, credit, debit } = req.body;

    // Validation
    if (!partyName || (!amount && !credit && !debit)) {
      return res.status(400).json({
        success: false,
        message: 'Party name and amount are required'
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

    // Handle both old format (amount + tnsType) and new format (credit + debit)
    let finalCredit = 0;
    let finalDebit = 0;
    let finalTnsType = tnsType;

    if (credit !== undefined && debit !== undefined) {
      // New format: frontend sends credit and debit directly
      finalCredit = parseFloat(credit) || 0;
      finalDebit = parseFloat(debit) || 0;
      
      // Determine transaction type based on which field has value
      if (finalCredit > 0 && finalDebit === 0) {
        finalTnsType = 'CR';
      } else if (finalDebit > 0 && finalCredit === 0) {
        finalTnsType = 'DR';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either credit or debit must be provided, not both'
        });
      }
    } else if (amount && tnsType) {
      // Old format: calculate credit/debit from amount and type
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount cannot be zero'
        });
      }
      
      if (tnsType === 'CR') {
        finalCredit = parsedAmount;
      } else if (tnsType === 'DR') {
        finalDebit = parsedAmount;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Transaction type must be CR or DR'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format'
      });
    }

    // Get current date in ISO format for MongoDB
    const today = new Date();
    const date = today.toISOString();

    // Generate transaction ID
    const ti = `${Date.now()}:`;

    const newEntry = new LedgerEntry({
      partyName,
      date,
      remarks: remarks || '', // Default to empty string if remarks is not provided
      tnsType: finalTnsType,
      credit: finalCredit,
      debit: finalDebit,
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
    const { remarks, amount, tnsType, credit, debit } = req.body;

    const entry = await LedgerEntry.findOne({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Update fields
    if (remarks !== undefined) entry.remarks = remarks;
    
    // Handle both old format (amount + tnsType) and new format (credit + debit)
    if (credit !== undefined && debit !== undefined) {
      // New format: frontend sends credit and debit directly
      entry.credit = parseFloat(credit) || 0;
      entry.debit = parseFloat(debit) || 0;
      
      // Determine transaction type based on which field has value
      if (entry.credit > 0 && entry.debit === 0) {
        entry.tnsType = 'CR';
      } else if (entry.debit > 0 && entry.credit === 0) {
        entry.tnsType = 'DR';
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either credit or debit must be provided, not both'
        });
      }
    } else if (amount !== undefined && tnsType !== undefined) {
      // Old format: calculate credit/debit from amount and type
      if (tnsType === 'CR') {
        entry.credit = parseFloat(amount);
        entry.debit = 0;
      } else if (tnsType === 'DR') {
        entry.debit = parseFloat(amount);
        entry.credit = 0;
      }
      entry.tnsType = tnsType;
    }

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

      // Find the last Monday Final settlement
      const lastMondayFinal = entries
        .filter(entry => entry.tnsType === 'Monday Settlement')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      // Get entries to settle (from last Monday Final to current, excluding Monday Final entries)
      let entriesToSettle = [];
      if (lastMondayFinal) {
        // Get entries after the last Monday Final
        entriesToSettle = entries.filter(entry => 
          new Date(entry.date) > new Date(lastMondayFinal.date) && 
          entry.tnsType !== 'Monday Settlement'
        );
      } else {
        // If no previous Monday Final, settle all non-Monday Final entries
        entriesToSettle = entries.filter(entry => entry.tnsType !== 'Monday Settlement');
      }
      
      if (entriesToSettle.length === 0) {
        results.push({
          partyName,
          success: false,
          message: 'No new entries to settle since last Monday Final'
        });
        continue;
      }

      // Calculate settlement data for all entries to settle
      const summary = calculateSummary(entriesToSettle);
      const today = new Date();
      const date = today.toISOString();

      // Create Monday Final settlement entry
      // Monday Final should show what WE need to pay or receive to settle
      const settlementAmount = Math.abs(summary.calculatedBalance);
      const isCredit = summary.calculatedBalance > 0; // Positive balance means we need to pay (Credit)
      const isDebit = summary.calculatedBalance < 0;  // Negative balance means we need to receive (Debit)
      
      console.log('Monday Final settlement calculation:', {
        calculatedBalance: summary.calculatedBalance,
        settlementAmount,
        isCredit,
        isDebit,
        entriesToSettle: entriesToSettle.length
      });

      const settlementEntry = new LedgerEntry({
        partyName,
        date,
        remarks: `Monday Final ${date} - ${entriesToSettle.length} entries settled - ${isCredit ? 'To Pay' : 'To Receive'} ₹${settlementAmount}`,
        tnsType: 'Monday Settlement',
        credit: isCredit ? settlementAmount : 0, // Credit if we need to pay them
        debit: isDebit ? settlementAmount : 0,  // Debit if we need to receive from them
        balance: summary.calculatedBalance, // Show actual balance
        chk: false,
        ti: `${Date.now()}:`,
        userId
      });

      await settlementEntry.save();

      results.push({
        partyName,
        success: true,
        message: 'Monday Final settlement completed',
        data: {
          settlementEntry,
          summary,
          entriesSettled: entriesToSettle.length
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
  deleteParties,
  fixOldMondayFinalEntries
}; 