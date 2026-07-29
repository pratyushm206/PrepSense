const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const connectDB = require('./config/db');
const express = require('express');
const app = express();
const errorHandler = require('./middleware/errorHandler');

const helmet = require('helmet');
const cors = require('cors');
app.use(helmet());
app.use(cors());


app.use(express.json());
connectDB();

const PORT = process.env.PORT || 5000;

// adding routes

// GET routes- 
// Test get route
app.get('/' , (req, res) => {
    res.json({message : 'PrepSense API live'});
});
// health check route
app.get('/api/health', (req,res) =>{
    res.json({ status: 'OK' });
});

// POST Routes
app.use('/api/answers', require('./routes/answers'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/companies', require('./routes/companies'));
app.use(errorHandler);

// server is running on PORT : 5000
app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));