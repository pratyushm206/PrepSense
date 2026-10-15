require('dotenv').config();

const dns = require('dns');
if (process.env.DNS_OVERRIDE === '1') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const connectDB = require('./config/db');
const express = require('express');
const app = express();
const errorHandler = require('./middleware/errorHandler');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
for (const key of ['MONGO_URI', 'JWT_SECRET', 'GEMINI_API_KEY']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:']
    }
  }
}));
if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
} else if (process.env.CLIENT_URL) {
  app.use(cors({ origin: process.env.CLIENT_URL }));
}


app.use(express.json({ limit: '100kb' }));

const PORT = process.env.PORT || 5000;

// adding routes

// GET routes- 
// health check route
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ status: connected ? 'OK' : 'DEGRADED', database: connected ? 'connected' : 'disconnected' });
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
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.get('/api/public/report/:token', require('./controllers/sessionController').getPublicReport);
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found' }));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}
app.use(errorHandler);

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`Server is running on port http://localhost:${PORT}`));
};

startServer();
