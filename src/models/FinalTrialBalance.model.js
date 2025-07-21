import mongoose from 'mongoose';

const finalTrialBalanceSchema = new mongoose.Schema({
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewParty',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  },
  tnsType: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  checked: {
    type: Boolean,
    default: false
  },
  timeIndex: {
    type: String,
    required: true
  }
});

const FinalTrialBalance = mongoose.model('FinalTrialBalance', finalTrialBalanceSchema);

export default FinalTrialBalance;
