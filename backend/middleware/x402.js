/**
 * x402 Payment Middleware
 * Enables AI agents to pay for API access using USDC on Base/Solana
 * 
 * Compliant with:
 * - x402 Protocol Specification
 * - x402scan Validation Schema
 * - Coinbase CDP Facilitator API
 */

const { ethers } = require('ethers');

// x402 configuration
const X402_CONFIG = {
  // x402 protocol version
  version: 1,
  
  // Coinbase CDP facilitator (fee-free USDC on Base)
  facilitator: 'https://x402.coinbase.com',
  
  // Your wallet address for receiving USDC
  walletAddress: process.env.X402_WALLET_ADDRESS || '0x9B6C3EE1f3A155456C4da066D7398Fa75c4a127E',
  
  // Supported networks (CAIP-2 format)
  networks: ['eip155:8453'], // Base mainnet
  
  // Payment scheme
  scheme: 'exact',
  
  // Payment asset (USDC on Base)
  asset: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  
  // Default timeout (5 minutes)
  maxTimeoutSeconds: 300,
  
  // Pricing per endpoint
  pricing: {
    '/api/opportunities': {
      amount: '0.03',
      description: 'Get all current arbitrage opportunities across 5 sports',
      mimeType: 'application/json'
    },
    '/api/opportunities/:id': {
      amount: '0.01',
      description: 'Get specific arbitrage opportunity by ID',
      mimeType: 'application/json'
    }
  }
};

/**
 * x402 middleware - handles crypto payments from AI agents
 * Compliant with x402 specification
 */
async function x402Middleware(req, res, next) {
  // Skip x402 if traditional API key is provided
  if (req.headers['x-api-key']) {
    return next();
  }
  
  // Check if payment signature is present
  const paymentSignature = req.headers['payment-signature'];
  
  if (!paymentSignature) {
    // No payment provided - return 402 with x402-compliant payment instructions
    return send402PaymentRequired(req, res);
  }
  
  // Verify payment
  try {
    const isValid = await verifyPayment(req, paymentSignature);
    
    if (!isValid) {
      return res.status(402).json({
        x402Version: X402_CONFIG.version,
        error: 'Payment verification failed - invalid or insufficient payment signature'
      });
    }
    
    // Payment verified - continue to route handler
    req.paidViaX402 = true;
    next();
    
  } catch (error) {
    console.error('x402 payment error:', error);
    return res.status(500).json({
      x402Version: X402_CONFIG.version,
      error: 'Payment processing failed: ' + error.message
    });
  }
}

/**
 * Send 402 Payment Required response with x402-compliant headers
 * Includes x402scan validation schema for discoverability
 */
function send402PaymentRequired(req, res) {
  const endpoint = req.path;
  const pricing = getEndpointPricing(endpoint);
  
  // Build x402-compliant accepts array (x402scan format)
  const accepts = [{
    scheme: X402_CONFIG.scheme,
    network: 'base',
    maxAmountRequired: pricing.amount,
    resource: endpoint,
    description: pricing.description,
    mimeType: pricing.mimeType,
    payTo: X402_CONFIG.walletAddress,
    maxTimeoutSeconds: X402_CONFIG.maxTimeoutSeconds,
    asset: X402_CONFIG.asset,
    
    // Output schema for x402scan UI generation
    outputSchema: {
      input: {
        type: 'http',
        method: req.method,
        queryParams: getQueryParamsSchema(endpoint),
        headerFields: {
          'Payment-Signature': {
            type: 'string',
            required: true,
            description: 'x402 payment signature (base64-encoded)'
          }
        }
      },
      output: getOutputSchema(endpoint)
    }
  }];
  
  // x402-compliant response body
  const responseBody = {
    x402Version: X402_CONFIG.version,
    accepts: accepts,
    error: `Payment required: ${pricing.amount} USDC on Base network`
  };
  
  // Set x402 headers (both formats for compatibility)
  res.status(402)
    .set('WWW-Authenticate', `x402 version=${X402_CONFIG.version}`)
    .set('Payment-Required', JSON.stringify(accepts[0]))
    .set('Access-Control-Expose-Headers', 'Payment-Required, WWW-Authenticate')
    .json(responseBody);
}

/**
 * Verify payment signature via Coinbase facilitator
 */
async function verifyPayment(req, paymentSignature) {
  const endpoint = req.path;
  const pricing = getEndpointPricing(endpoint);
  const expectedAmount = pricing.amount;
  
  try {
    // Parse payment signature (base64-encoded JSON)
    const payment = JSON.parse(Buffer.from(paymentSignature, 'base64').toString());
    
    // Verify payment amount
    if (parseFloat(payment.amount) < parseFloat(expectedAmount)) {
      console.log('Insufficient payment amount');
      return false;
    }
    
    // Verify recipient address
    if (payment.recipient.toLowerCase() !== X402_CONFIG.walletAddress.toLowerCase()) {
      console.log('Invalid recipient address');
      return false;
    }
    
    // Verify network
    if (!X402_CONFIG.networks.includes(payment.network)) {
      console.log('Unsupported network');
      return false;
    }
    
    // Verify signature via Coinbase facilitator
    const facilitatorResponse = await fetch(`${X402_CONFIG.facilitator}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signature: paymentSignature,
        amount: expectedAmount,
        asset: X402_CONFIG.asset,
        recipient: X402_CONFIG.walletAddress,
        network: payment.network
      })
    });
    
    if (!facilitatorResponse.ok) {
      console.log('Facilitator verification failed');
      return false;
    }
    
    const verification = await facilitatorResponse.json();
    
    // Log successful payment
    console.log(`✅ x402 payment verified: ${expectedAmount} USDC from agent`);
    
    return verification.valid === true;
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

/**
 * Get pricing configuration for endpoint
 */
function getEndpointPricing(endpoint) {
  // Normalize endpoint (remove IDs)
  const normalizedEndpoint = endpoint.replace(/\/\d+$/, '/:id');
  
  return X402_CONFIG.pricing[normalizedEndpoint] || X402_CONFIG.pricing['/api/opportunities'];
}

/**
 * Get query params schema for x402scan
 */
function getQueryParamsSchema(endpoint) {
  if (endpoint === '/api/opportunities') {
    return {
      sport: {
        type: 'string',
        required: false,
        description: 'Filter by sport',
        enum: ['soccer', 'basketball', 'tennis', 'nfl', 'mlb']
      },
      min_profit: {
        type: 'number',
        required: false,
        description: 'Minimum profit percentage (e.g., 2.0 for 2%)'
      },
      stake: {
        type: 'number',
        required: false,
        description: 'Calculate exact stake amounts for this total stake (e.g., 100 for $100)'
      }
    };
  }
  
  if (endpoint.includes('/:id')) {
    return {
      stake: {
        type: 'number',
        required: false,
        description: 'Calculate exact stake amounts for this total stake'
      }
    };
  }
  
  return {};
}

/**
 * Get output schema for x402scan
 */
function getOutputSchema(endpoint) {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      count: { type: 'number' },
      opportunities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            match: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sport: { type: 'string' },
                team1: { type: 'string' },
                team2: { type: 'string' }
              }
            },
            profit_percentage: { type: 'number' },
            bets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  outcome: { type: 'string' },
                  bookmaker: { type: 'string' },
                  odds: { type: 'number' },
                  stake_percentage: { type: 'number' },
                  stake_amount: { type: 'number' },
                  potential_return: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  };
}

/**
 * Optional: x402 middleware - allows both API keys AND crypto payments
 */
async function x402OrApiKey(req, res, next) {
  // Try API key first
  if (req.headers['x-api-key']) {
    return next();
  }
  
  // Try x402 payment
  return x402Middleware(req, res, next);
}

module.exports = {
  x402Middleware,
  x402OrApiKey,
  X402_CONFIG
};
