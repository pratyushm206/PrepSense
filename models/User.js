const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  targetCompanies: {
    type: [String],
    default: []
  },
  college: { type: String, trim: true, maxlength: 120, default: '' },
  graduationYear: { type: Number, min: 1900, max: 2200, default: null },
  githubUrl: { type: String, trim: true, maxlength: 300, default: '' },
  linkedinUrl: { type: String, trim: true, maxlength: 300, default: '' },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
