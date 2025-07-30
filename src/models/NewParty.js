const mongoose = require('mongoose');

const selfLDSchema = new mongoose.Schema({
  M: { type: String, default: '' },
  S: { type: String, default: '' },
  A: { type: String, default: '' },
  T: { type: String, default: '' },
  C: { type: String, default: '' }
});

const agentLDSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  M: { type: String, default: '' },
  S: { type: String, default: '' },
  A: { type: String, default: '' },
  T: { type: String, default: '' },
  C: { type: String, default: '' }
});

const thirdPartyLDSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  M: { type: String, default: '' },
  S: { type: String, default: '' },
  A: { type: String, default: '' },
  T: { type: String, default: '' },
  C: { type: String, default: '' }
});

const commissionSchema = new mongoose.Schema({
  M: { type: String, default: '' },
  S: { type: String, default: '' }
});

const newPartySchema = new mongoose.Schema({
  srNo: {
    type: String,
    required: [true, 'SR Number is required'],
    unique: true,
    trim: true
  },
  partyName: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true,
    maxlength: [200, 'Party name cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['R', 'A'],
    default: 'A',
    required: true
  },
  commiSystem: {
    type: String,
    enum: ['Take', 'Give'],
    required: [true, 'Commission system is required']
  },
  balanceLimit: {
    type: String,
    default: '0',
    trim: true
  },
  mCommission: {
    type: String,
    enum: ['No Commission', 'With Commission'],
    default: 'No Commission'
  },
  rate: {
    type: String,
    default: '0',
    trim: true
  },
  selfLD: {
    type: selfLDSchema,
    default: () => ({})
  },
  agentLD: {
    type: agentLDSchema,
    default: () => ({})
  },
  thirdPartyLD: {
    type: thirdPartyLDSchema,
    default: () => ({})
  },
  selfCommission: {
    type: commissionSchema,
    default: () => ({})
  },
  agentCommission: {
    type: commissionSchema,
    default: () => ({})
  },
  thirdPartyCommission: {
    type: commissionSchema,
    default: () => ({})
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
newPartySchema.index({ userId: 1 });
newPartySchema.index({ partyName: 1 });
newPartySchema.index({ srNo: 1 });
newPartySchema.index({ status: 1 });

// Virtual for formatted party name
newPartySchema.virtual('formattedPartyName').get(function() {
  return `${this.srNo}-${this.partyName}`;
});

// Ensure virtuals are included in JSON output
newPartySchema.set('toJSON', { virtuals: true });
newPartySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('NewParty', newPartySchema); 