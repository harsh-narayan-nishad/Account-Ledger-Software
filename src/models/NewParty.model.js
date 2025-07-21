import mongoose from 'mongoose';

const partySchema = new mongoose.Schema({
  srNo: {
    type: String,
    required: true,
    unique: true
  },
  partyName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['R', 'A', 'I'],
    default: 'R'
  },
  commiSystem: {
    type: String,
    enum: ['Take', 'Give'],
    required: true
  },
  balanceLimit: {
    type: Number,
    required: true
  },
  mCommission: {
    type: String,
    default: 'No Commission'
  },
  rate: {
    type: Number,
    required: true
  },
  selfLD: {
    M: { type: String },
    S: { type: String },
    A: { type: String },
    T: { type: String },
    C: { type: String }
  },
  agentLD: {
    name: { type: String },
    M: { type: String },
    S: { type: String },
    A: { type: String },
    T: { type: String },
    C: { type: String }
  },
  thirdPartyLD: {
    name: { type: String },
    M: { type: String },
    S: { type: String },
    A: { type: String },
    T: { type: String },
    C: { type: String }
  },
  selfCommission: {
    M: { type: String },
    S: { type: String }
  },
  agentCommission: {
    M: { type: String },
    S: { type: String }
  },
  thirdPartyCommission: {
    M: { type: String },
    S: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const NewParty = mongoose.model('NewParty', partySchema);

export default NewParty;
