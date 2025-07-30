const LedgerEntry = require('../models/LedgerEntry');
const NewParty = require('../models/NewParty');

// Get final trial balance
const getFinalTrialBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partyName } = req.query;

    let query = { userId };
    
    if (partyName) {
      query.partyName = partyName;
    }

    // Get all ledger entries
    const entries = await LedgerEntry.find(query).sort({ date: 1 });

    // Calculate credit and debit totals
    const creditEntries = entries
      .filter(entry => entry.tnsType === 'CR')
      .map(entry => ({
        id: entry._id.toString(),
        name: entry.partyName,
        amount: entry.credit,
        type: 'credit'
      }));

    const debitEntries = entries
      .filter(entry => entry.tnsType === 'DR')
      .map(entry => ({
        id: entry._id.toString(),
        name: entry.partyName,
        amount: entry.debit,
        type: 'debit'
      }));

    const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const debitTotal = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);

    res.json({
      success: true,
      message: 'Trial balance retrieved successfully',
      data: {
        creditEntries,
        debitEntries,
        creditTotal,
        debitTotal,
        balanceDifference: creditTotal - debitTotal
      }
    });
  } catch (error) {
    console.error('Get final trial balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trial balance'
    });
  }
};

// Get trial balance for specific party
const getPartyBalance = async (req, res) => {
  try {
    const { partyName } = req.params;
    const userId = req.user.id;

    // Validate party exists
    const party = await NewParty.findOne({ 
      partyName: decodeURIComponent(partyName), 
      userId 
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Get all entries for this party
    const entries = await LedgerEntry.find({ 
      partyName: decodeURIComponent(partyName), 
      userId 
    }).sort({ date: 1 });

    // Calculate running balance
    let runningBalance = 0;
    const processedEntries = entries.map(entry => {
      if (entry.tnsType === 'CR') {
        runningBalance += entry.credit;
      } else if (entry.tnsType === 'DR') {
        runningBalance -= entry.debit;
      }
      
      return {
        id: entry._id.toString(),
        name: entry.partyName,
        amount: Math.abs(runningBalance),
        type: runningBalance >= 0 ? 'credit' : 'debit'
      };
    });

    // Get final balance
    const finalBalance = processedEntries.length > 0 
      ? processedEntries[processedEntries.length - 1] 
      : { amount: 0, type: 'credit' };

    res.json({
      success: true,
      message: 'Party balance retrieved successfully',
      data: finalBalance
    });
  } catch (error) {
    console.error('Get party balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get party balance'
    });
  }
};

// Generate trial balance report
const generateReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, partyName } = req.body;

    let query = { userId };
    
    if (partyName) {
      query.partyName = partyName;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get entries for the specified period
    const entries = await LedgerEntry.find(query).sort({ date: 1 });

    // Calculate credit and debit totals
    const creditEntries = entries
      .filter(entry => entry.tnsType === 'CR')
      .map(entry => ({
        id: entry._id.toString(),
        name: entry.partyName,
        amount: entry.credit,
        type: 'credit',
        date: entry.date
      }));

    const debitEntries = entries
      .filter(entry => entry.tnsType === 'DR')
      .map(entry => ({
        id: entry._id.toString(),
        name: entry.partyName,
        amount: entry.debit,
        type: 'debit',
        date: entry.date
      }));

    const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const debitTotal = debitEntries.reduce((sum, entry) => sum + entry.amount, 0);

    res.json({
      success: true,
      message: 'Report generated successfully',
      data: {
        creditEntries,
        debitEntries,
        creditTotal,
        debitTotal,
        balanceDifference: creditTotal - debitTotal,
        reportPeriod: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time'
        }
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

module.exports = {
  getFinalTrialBalance,
  getPartyBalance,
  generateReport
}; 