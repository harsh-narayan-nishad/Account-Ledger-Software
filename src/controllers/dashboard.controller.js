/**
 * Dashboard Controller
 * 
 * Provides dashboard statistics and analytics for the Account Ledger Software.
 * Handles real-time data aggregation and reporting.
 * 
 * Features:
 * - Total parties count
 * - Total transactions count
 * - Total balance calculation
 * - Settlement statistics
 * - Performance metrics
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const NewParty = require('../models/NewParty');
const LedgerEntry = require('../models/LedgerEntry');

/**
 * Get Dashboard Statistics
 * 
 * Retrieves real-time statistics for the dashboard including:
 * - Total parties count
 * - Total transactions count
 * - Total balance across all parties
 * - Settlement statistics
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get total parties count
    const totalParties = await NewParty.countDocuments();
    
    // Get total transactions count
    const totalTransactions = await LedgerEntry.countDocuments();
    
    // Calculate total balance across all parties
    const balanceResult = await LedgerEntry.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: {
            $sum: {
              $cond: [
                { $eq: ['$tnsType', 'CR'] },
                '$absoluteAmount',
                { $multiply: ['$absoluteAmount', -1] }
              ]
            }
          }
        }
      }
    ]);
    
    const totalBalance = balanceResult.length > 0 ? balanceResult[0].totalBalance : 0;
    
    // Get settlement statistics (Monday Final entries)
    const settlements = await LedgerEntry.countDocuments({
      tnsType: 'Monday Settlement'
    });
    
    // Get recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await LedgerEntry.countDocuments({
      date: { $gte: sevenDaysAgo }
    });
    
    // Get monthly growth (current month vs last month)
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    
    const currentMonthTransactions = await LedgerEntry.countDocuments({
      date: { $gte: currentMonthStart }
    });
    
    const lastMonthTransactions = await LedgerEntry.countDocuments({
      date: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const transactionGrowth = lastMonthTransactions > 0 
      ? Math.round(((currentMonthTransactions - lastMonthTransactions) / lastMonthTransactions) * 100)
      : 0;
    
    // Calculate balance growth
    const currentMonthBalance = await LedgerEntry.aggregate([
      {
        $match: {
          date: { $gte: currentMonthStart }
        }
      },
      {
        $group: {
          _id: null,
          balance: {
            $sum: {
              $cond: [
                { $eq: ['$tnsType', 'CR'] },
                '$absoluteAmount',
                { $multiply: ['$absoluteAmount', -1] }
              ]
            }
          }
        }
      }
    ]);
    
    const lastMonthBalance = await LedgerEntry.aggregate([
      {
        $match: {
          date: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          balance: {
            $sum: {
              $cond: [
                { $eq: ['$tnsType', 'CR'] },
                '$absoluteAmount',
                { $multiply: ['$absoluteAmount', -1] }
              ]
            }
          }
        }
      }
    ]);
    
    const currentBalance = currentMonthBalance.length > 0 ? currentMonthBalance[0].balance : 0;
    const lastBalance = lastMonthBalance.length > 0 ? lastMonthBalance[0].balance : 0;
    
    const balanceGrowth = lastBalance !== 0 
      ? Math.round(((currentBalance - lastBalance) / Math.abs(lastBalance)) * 100)
      : 0;
    
    // Get party growth
    const currentMonthParties = await NewParty.countDocuments({
      createdAt: { $gte: currentMonthStart }
    });
    
    const lastMonthParties = await NewParty.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const partyGrowth = lastMonthParties > 0 
      ? Math.round(((currentMonthParties - lastMonthParties) / lastMonthParties) * 100)
      : 0;
    
    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        totalParties: {
          count: totalParties,
          growth: partyGrowth
        },
        totalTransactions: {
          count: totalTransactions,
          growth: transactionGrowth,
          recent: recentTransactions
        },
        totalBalance: {
          amount: totalBalance,
          growth: balanceGrowth
        },
        settlements: {
          count: settlements
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics'
    });
  }
};

module.exports = {
  getDashboardStats
}; 