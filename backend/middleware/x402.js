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
      output: getOutp
