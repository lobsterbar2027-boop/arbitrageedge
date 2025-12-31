const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { authenticateApiKey } = require('./middleware/auth');
const { x402OrApiKey } = require('./middleware/x402');
const opportunitiesRouter = require('./routes/opportunities');
const { startScheduler } = require('./scrapers/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'ArbitrageEdge API',
    version: '1.0.0',
    description: 'Real-time sports betting arbitrage opportunities'
  });
});

app.use('/api/opportunities', x402OrApiKey, opportunitiesRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log('🚀 ArbitrageEdge API Server');
  console.log(`✅ Server running on port ${PORT}`);
  
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    console.log('🔄 Starting background scheduler...');
    startScheduler();
  }
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
