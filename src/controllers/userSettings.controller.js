const UserSettings = require('../models/UserSettings');

// Get user settings
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new UserSettings({ userId });
      await settings.save();
    }

    res.json({
      success: true,
      message: 'User settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings'
    });
  }
};

// Create user settings
const createUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = { ...req.body, userId };

    // Check if settings already exist
    const existingSettings = await UserSettings.findOne({ userId });
    if (existingSettings) {
      return res.status(400).json({
        success: false,
        message: 'User settings already exist'
      });
    }

    const settings = new UserSettings(settingsData);
    await settings.save();

    res.status(201).json({
      success: true,
      message: 'User settings created successfully',
      data: settings
    });
  } catch (error) {
    console.error('Create user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user settings'
    });
  }
};

// Update user settings
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      // Create settings if they don't exist
      settings = new UserSettings({ userId, ...updateData });
    } else {
      // Update existing settings
      Object.assign(settings, updateData);
    }

    await settings.save();

    res.json({
      success: true,
      message: 'User settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user settings'
    });
  }
};

// Delete user settings
const deleteUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await UserSettings.findOne({ userId });
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found'
      });
    }

    await UserSettings.findByIdAndDelete(settings._id);

    res.json({
      success: true,
      message: 'User settings deleted successfully',
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Delete user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user settings'
    });
  }
};

module.exports = {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings
}; 