const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  decimalFormat: {
    type: String,
    enum: ['FULL AMOUNT', 'DECIMAL', 'CURRENCY'],
    default: 'FULL AMOUNT'
  },
  companyAccount: {
    type: String,
    default: '',
    trim: true
  },
  password: {
    type: String,
    default: '',
    trim: true
  },
  entryOrder: {
    type: String,
    enum: ['FIRST AMOUNT', 'LAST AMOUNT', 'CUSTOM ORDER'],
    default: 'FIRST AMOUNT'
  },
  ntPosition: {
    type: String,
    enum: ['BOTTOM', 'TOP', 'MIDDLE'],
    default: 'BOTTOM'
  },
  agentReport: {
    type: String,
    enum: ['THREE', 'FIVE', 'TEN'],
    default: 'THREE'
  },
  color: {
    type: String,
    enum: ['Blue', 'Green', 'Red', 'Purple'],
    default: 'Blue'
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
userSettingsSchema.index({ userId: 1 });

module.exports = mongoose.model('UserSettings', userSettingsSchema); 