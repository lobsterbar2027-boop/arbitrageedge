/**
 * ArbitrageEdge API Server
 * Main Express application
 */

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'ArbitrageEdge API',
    version: '1.0.0',
    description: 'Real-time sports betting arbitrage opportunities',
    endpoints: {
      opportunities: {
        'GET /api/opportunities': {
          description: 'Get all arbitrage opportunities',
          auth_required: true,
          query_params: {
            sport: 'Filter by sport (soccer, basketball, tennis, nfl, mlb)',
            min_profit: 'Minimum profit percentage (e.g., 1.5)',
            stake: 'Calculate exact amounts for this total stake'
          },
          example: '/api/opportunities?sport=soccer&min_profit=2&stake=100'
        },
        'GET /api/opportunities/:id': {
          description: 'Get specific arbitrage opportunity',
          auth_required: true,
          query_params: {
            stake: 'Calculate exact amounts for this total stake'
          }
        },
        'GET /api/opportunities/sports/list': {
          description: 'Get list of available sports',
          auth_required: false
        }
      },
      health: {
        'GET /health': {
          description: 'Health check endpoint',
          auth_required: false
        }
      }
    },
    authentication: {
      methods: [
        {
          name: 'API Key',
          method: 'API Key',
          header: 'X-API-Key',
          example: 'X-API-Key: your_api_key_here',
          demo_key: 'demo_key_12345',
          description: 'Traditional API key authentication for human developers'
        },
        {
          name: 'x402 Payment',
          method: 'Crypto Payment',
          header: 'Payment-Signature',
          example: 'Payment-Signature: base64_encoded_payment_signature',
          description: 'AI agents can pay with USDC on Base/Solana networks',
          networks: ['Base (eip155:8453)', 'Solana (solana:mainnet)'],
          token: 'USDC',
          facilitator: 'Coinbase CDP (fee-free)',
          pricing: {
            '/api/opportunities': '$0.01 per request',
            '/api/opportunities/:id': '$0.005 per request'
          }
        }
      ]
    },
    rate_limits: {
      free: '100 requests/day',
      starter: '5,000 requests/day',
      pro: '50,000 requests/day',
      enterprise: 'Unlimited'
    }
  });
});

// Protected API routes (require authentication OR payment)
// Supports BOTH:
// 1. Traditional API keys (X-API-Key header)
// 2. x402 crypto payments (Payment-Signature header) for AI agents
app.use('/api/opportunities', x402OrApiKey, opportunitiesRouter);

// Catch-all route - serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ArbitrageEdge API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`🏠 Frontend: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // Start the scraper scheduler
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    console.log('🔄 Starting background scheduler...');
    startScheduler();
  } else {
    console.log('⏸️  Scheduler disabled (set ENABLE_SCHEDULER=true to enable)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
