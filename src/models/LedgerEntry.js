/**
 * Ledger Entry Model
 * 
 * Defines the LedgerEntry schema for storing transaction records
 * in the Account Ledger Software.
 * 
 * Features:
 * - Transaction type validation (CR/DR)
 * - Automatic balance calculation
 * - Date and time tracking
 * - User association
 * - Checkbox selection for batch operations
 * - Monday Final settlement support
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  partyName: {
    type: String,
    required: [true, 'Party name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  remarks: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters'],
    default: ''
  },
  tnsType: {
    type: String,
    enum: ['CR', 'DR', 'Monday Settlement'],
    required: [true, 'Transaction type is required']
  },
  credit: {
    type: Number,
    default: 0,
    min: [0, 'Credit amount cannot be negative']
  },
  debit: {
    type: Number,
    default: 0,
    min: [0, 'Debit amount cannot be negative']
  },
  balance: {
    type: Number,
    default: 0
  },
  chk: {
    type: Boolean,
    default: false
  },
  ti: {
    type: String,
    default: '',
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  mondayFinal: {
    type: String,
    enum: ['Yes', 'No'],
    default: 'No'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ledgerEntrySchema.index({ userId: 1 });
ledgerEntrySchema.index({ partyName: 1 });
ledgerEntrySchema.index({ date: 1 });
ledgerEntrySchema.index({ tnsType: 1 });
ledgerEntrySchema.index({ mondayFinal: 1 });

// Virtual for amount (positive for credit, negative for debit)
ledgerEntrySchema.virtual('amount').get(function() {
  if (this.tnsType === 'CR') {
    return this.credit;
  } else if (this.tnsType === 'DR') {
    return -this.debit;
  }
  return 0;
});

// Ensure virtuals are included in JSON output
ledgerEntrySchema.set('toJSON', { virtuals: true });
ledgerEntrySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema); 