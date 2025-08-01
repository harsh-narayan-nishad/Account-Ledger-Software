/**
 * User Model
 * 
 * Defines the User schema for the Account Ledger Software.
 * Handles user authentication, profile management, and data validation.
 * 
 * Features:
 * - Password hashing with bcrypt (optimized for performance)
 * - Email validation and uniqueness
 * - Profile information storage
 * - Authentication token management
 * - Account creation and update timestamps
 * - Optimized database indexing
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Optimized indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1, isActive: 1 }); // Compound index for login queries

// Hash password before saving (optimized salt rounds)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Reduced salt rounds for better performance (from 10000 to 12)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Optimized password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema); 