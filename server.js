const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();

const connectDB = require('./config/db');
const express = require('express');
const app = express();

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
// questions route
app.post('/api/questions', (req,res) =>{
    res.json({message: 'Questions endpoint'});
});
// answer route
app.post('/api/answers', (req,res) =>{
    res.json({message:'Answers endpoint'});
});
// sessions route
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/auth', require('./routes/auth'));

// server is running on PORT : 5000
app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));