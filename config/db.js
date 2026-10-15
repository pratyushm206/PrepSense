// This file handles mongoDB connection

// importing mongoose
const mongoose = require('mongoose');
const Session = require('../models/Session');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverApi: { version: '1', strict: true, deprecationErrors: true }
    });
    const indexes = await Session.collection.indexes();
    const legacyShareIndex = indexes.find(index => index.name === 'shareToken_1' && index.sparse);
    if (legacyShareIndex) {
      await Session.collection.dropIndex('shareToken_1');
    }
    await Session.createIndexes();
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};


// export it, so that server can use it
module.exports = connectDB;
