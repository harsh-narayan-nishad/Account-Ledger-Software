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
 * - Recent activity tracking
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

/**
 * Get Recent Activity
 * 
 * Retrieves recent activity for the current user including:
 * - Recent transactions
 * - Recent party creations
 * - Recent settlements
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's parties
    const userParties = await NewParty.find({ userId: userId }).select('_id partyName');
    const partyIds = userParties.map(party => party._id);
    const partyMap = new Map(userParties.map(party => [party._id.toString(), party.partyName]));
    
    // Get recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await LedgerEntry.find({
      partyId: { $in: partyIds },
      date: { $gte: sevenDaysAgo },
      tnsType: { $ne: 'Monday Settlement' }
    })
    .sort({ date: -1 })
    .limit(5)
    .lean();
    
    // Get recent settlements
    const recentSettlements = await LedgerEntry.find({
      partyId: { $in: partyIds },
      tnsType: 'Monday Settlement',
      date: { $gte: sevenDaysAgo }
    })
    .sort({ date: -1 })
    .limit(3)
    .lean();
    
    // Get recent party creations
    const recentParties = await NewParty.find({
      userId: userId,
      createdAt: { $gte: sevenDaysAgo }
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
    
    // Combine and format activities
    const activities = [];
    
    // Add transactions
    recentTransactions.forEach(transaction => {
      const partyName = partyMap.get(transaction.partyId.toString()) || 'Unknown Party';
      const amount = transaction.tnsType === 'CR' ? transaction.absoluteAmount : -transaction.absoluteAmount;
      const sign = amount >= 0 ? '+' : '';
      
      activities.push({
        type: 'transaction',
        title: `New transaction added to ${partyName}`,
        amount: `${sign}₹${Math.abs(amount).toLocaleString()}`,
        time: transaction.date,
        color: 'green'
      });
    });
    
    // Add settlements
    recentSettlements.forEach(settlement => {
      const partyName = partyMap.get(settlement.partyId.toString()) || 'Unknown Party';
      
      activities.push({
        type: 'settlement',
        title: `Monday Final settlement completed for ${partyName}`,
        amount: 'Settled',
        time: settlement.date,
        color: 'blue'
      });
    });
    
    // Add party creations
    recentParties.forEach(party => {
      activities.push({
        type: 'party',
        title: `New party "${party.partyName}" created`,
        amount: 'New',
        time: party.createdAt,
        color: 'purple'
      });
    });
    
    // Sort by time (most recent first) and limit to 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivity = activities.slice(0, 5);
    
    res.json({
      success: true,
      message: 'Recent activity retrieved successfully',
      data: recentActivity
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activity'
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity
}; 