import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true
  },
  decimalFormat: {
    type: String,
    enum: ['FULL AMOUNT', 'TWO DECIMAL', 'NO DECIMAL'],
    default: 'TWO DECIMAL'
  },
  companyAccount: {
    type: String,
    required: true,
    trim: true
  },
  entryOrder: {
    type: String,
    enum: ['FIRST AMOUNT', 'FIRST REMARKS'],
    default: 'FIRST AMOUNT'
  },
  ntPosition: {
    type: String,
    enum: ['TOP', 'BOTTOM'],
    default: 'BOTTOM'
  },
  agentReport: {
    type: String,
    enum: ['ONE', 'TWO', 'THREE'],
    default: 'ONE'
  },
  color: {
    type: String,
    enum: ['Blue', 'Green', 'Red', 'Purple'],
    default: 'Blue'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

export default UserSettings;
