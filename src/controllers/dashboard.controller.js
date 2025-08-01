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
    const userId = req.user.id; // Get current user ID from auth middleware
    
    // Get total parties count for current user
    const totalParties = await NewParty.countDocuments({ userId: userId });
    
    // Get total transactions count for current user's parties
    const userParties = await NewParty.find({ userId: userId }).select('_id');
    const partyIds = userParties.map(party => party._id);
    
    const totalTransactions = await LedgerEntry.countDocuments({
      partyId: { $in: partyIds }
    });
    
    // Calculate total balance across current user's parties
    const balanceResult = await LedgerEntry.aggregate([
      {
        $match: {
          partyId: { $in: partyIds }
        }
      },
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
    
    // Get settlement statistics (Monday Final entries) for current user's parties
    const settlements = await LedgerEntry.countDocuments({
      partyId: { $in: partyIds },
      tnsType: 'Monday Settlement'
    });
    
    // Get recent transactions (last 7 days) for current user's parties
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await LedgerEntry.countDocuments({
      partyId: { $in: partyIds },
      date: { $gte: sevenDaysAgo }
    });
    
    // Get monthly growth (current month vs last month) for current user
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    
    const currentMonthTransactions = await LedgerEntry.countDocuments({
      partyId: { $in: partyIds },
      date: { $gte: currentMonthStart }
    });
    
    const lastMonthTransactions = await LedgerEntry.countDocuments({
      partyId: { $in: partyIds },
      date: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const transactionGrowth = lastMonthTransactions > 0 
      ? Math.round(((currentMonthTransactions - lastMonthTransactions) / lastMonthTransactions) * 100)
      : 0;
    
    // Calculate balance growth for current user's parties
    const currentMonthBalance = await LedgerEntry.aggregate([
      {
        $match: {
          partyId: { $in: partyIds },
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
          partyId: { $in: partyIds },
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
    
    // Get party growth for current user
    const currentMonthParties = await NewParty.countDocuments({
      userId: userId,
      createdAt: { $gte: currentMonthStart }
    });
    
    const lastMonthParties = await NewParty.countDocuments({
      userId: userId,
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