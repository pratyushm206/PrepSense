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
app.use('/api/admin', require('./routes/admin'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use(errorHandler);

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));
};

startServer();
