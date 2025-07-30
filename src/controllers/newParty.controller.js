const NewParty = require('../models/NewParty');

// Get next SR number
const getNextSrNo = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the highest SR number for this user
    const lastParty = await NewParty.findOne({ userId })
      .sort({ srNo: -1 })
      .limit(1);

    let nextSrNo = '001';
    if (lastParty) {
      const lastNumber = parseInt(lastParty.srNo);
      nextSrNo = String(lastNumber + 1).padStart(3, '0');
    }

    res.json({
      success: true,
      message: 'Next SR number retrieved successfully',
      data: { nextSrNo }
    });
  } catch (error) {
    console.error('Get next SR number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get next SR number'
    });
  }
};

// Get all parties for user
const getAllParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, page = 1, limit = 50 } = req.query;

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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get parties with pagination
    const parties = await NewParty.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await NewParty.countDocuments(query);

    res.json({
      success: true,
      message: 'Parties retrieved successfully',
      data: parties,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all parties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parties'
    });
  }
};

// Get party by ID
const getPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const party = await NewParty.findOne({ _id: id, userId });
    
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    res.json({
      success: true,
      message: 'Party retrieved successfully',
      data: party
    });
  } catch (error) {
    console.error('Get party by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get party'
    });
  }
};

// Create new party
const createParty = async (req, res) => {
  try {
    const userId = req.user.id;
    const partyData = { ...req.body, userId };

    // Check if party name already exists for this user
    const existingParty = await NewParty.findOne({
      userId,
      partyName: partyData.partyName
    });

    if (existingParty) {
      return res.status(400).json({
        success: false,
        message: 'Party with this name already exists'
      });
    }

    // Check if SR number already exists for this user
    if (partyData.srNo) {
      const existingSrNo = await NewParty.findOne({
        userId,
        srNo: partyData.srNo
      });

      if (existingSrNo) {
        return res.status(400).json({
          success: false,
          message: 'SR number already exists'
        });
      }
    }

    const party = new NewParty(partyData);
    await party.save();

    res.status(201).json({
      success: true,
      message: 'Party created successfully',
      data: party
    });
  } catch (error) {
    console.error('Create party error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create party'
    });
  }
};

// Update party
const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if party exists and belongs to user
    const existingParty = await NewParty.findOne({ _id: id, userId });
    if (!existingParty) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Check if party name is being changed and if it conflicts
    if (updateData.partyName && updateData.partyName !== existingParty.partyName) {
      const nameConflict = await NewParty.findOne({
        userId,
        partyName: updateData.partyName,
        _id: { $ne: id }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Party with this name already exists'
        });
      }
    }

    // Check if SR number is being changed and if it conflicts
    if (updateData.srNo && updateData.srNo !== existingParty.srNo) {
      const srNoConflict = await NewParty.findOne({
        userId,
        srNo: updateData.srNo,
        _id: { $ne: id }
      });

      if (srNoConflict) {
        return res.status(400).json({
          success: false,
          message: 'SR number already exists'
        });
      }
    }

    const updatedParty = await NewParty.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Party updated successfully',
      data: updatedParty
    });
  } catch (error) {
    console.error('Update party error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update party'
    });
  }
};

// Delete party
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const party = await NewParty.findOne({ _id: id, userId });
    
    if (!party) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    await NewParty.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Party deleted successfully',
      data: {
        id: party._id,
        partyName: party.partyName
      }
    });
  } catch (error) {
    console.error('Delete party error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete party'
    });
  }
};

// Bulk delete parties
const bulkDeleteParties = async (req, res) => {
  try {
    const { partyIds } = req.body;
    const userId = req.user.id;

    if (!partyIds || !Array.isArray(partyIds)) {
      return res.status(400).json({
        success: false,
        message: 'Party IDs array is required'
      });
    }

    const result = await NewParty.deleteMany({
      _id: { $in: partyIds },
      userId
    });

    res.json({
      success: true,
      message: `${result.deletedCount} parties deleted successfully`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Bulk delete parties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete parties'
    });
  }
};

module.exports = {
  getNextSrNo,
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties
}; 