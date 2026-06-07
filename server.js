const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const connectDB = require('./config/db');
const express = require('express');
const app = express();

app.use(express.json());
connectDB();

const PORT = process.env.PORT || 5000;

// adding test routes
app.get('/' , (req, res) => {
    res.json({message : 'PrepSense API live'});
});
// server is running on PORT : 5000
app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));