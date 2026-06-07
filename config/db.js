// This file handles mongoDB connection

// importing mongoose
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverApi: { version: '1', strict: true, deprecationErrors: true }
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};


// export it, so that server can use it
module.exports = connectDB;