const mongoose = require('mongoose');

const CacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL: auto-delete after 24h
});

module.exports = mongoose.model('Cache', CacheSchema);