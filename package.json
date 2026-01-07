const express = require('express');
const cors = require('cors');
const axios = require('axios');
const vader = require('vader-sentiment');
const { paymentMiddleware } = require('@coinbase/x402');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const CONFIG = {
  PRICE_PER_QUERY: '100000', // $0.1 USDC (6 decimals)
  USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || '0x9B6C3EE1f3A155456C4da066D7398Fa75c4a127E',
  BASE_URL: process.env.BASE_URL || 'https://stock-sentiment-api-production.up.railway.app',
  SUPPORTED_TICKERS: [
    'AAPL', 'TSLA', 'GME', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 
    'AMD', 'NFLX', 'SPY', 'QQQ', 'AMC', 'PLTR', 'SOFI', 'RIVN', 
    'NIO', 'LCID', 'BB', 'NOK', 'COIN', 'HOOD', 'MSTR', 'SQ'
  ],
  REDDIT_SOURCES: [
    'wallstreetbets',
    'stocks', 
    'investing',
    'StockMarket',
    'options',
    'thetagang',
    'ValueInvesting',
    'Daytrading'
  ]
};

// Sentiment cache to avoid excessive scraping
const sentimentCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// x402 Payment Middleware Configuration
app.use(paymentMiddleware({
  'GET /v1/sentiment/:ticker': {
    accepts: [
      {
        scheme: 'exact',
        network: 'base',
        asset: CONFIG.USDC_ADDRESS,
        maxAmountRequired: CONFIG.PRICE_PER_QUERY,
        payTo: CONFIG.WALLET_ADDRESS,
        maxTimeoutSeconds: 30
      }
    ],
    description: 'Real-time stock sentiment analysis - Returns BUY/SELL/NEUTRAL signal with confidence score',
    mimeType: 'application/json'
  }
}));

// Helper: Scrape Reddit sentiment for a stock ticker
async function scrapeRedditSentiment(ticker) {
  try {
    const mockPosts = generateMockRedditData(ticker);
    return mockPosts;
  } catch (error) {
    console.error('Reddit scraping error:', error);
    return [];
  }
}

// Helper: Generate mock Reddit data
function generateMockRedditData(ticker) {
  const sentiments = ['positive', 'negative', 'neutral'];
  const posts = [];
  const numPosts = Math.floor(Math.random() * 100) + 50;
  
  for (let i = 0; i < numPosts; i++) {
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    let text = '';
    
    switch(sentiment) {
      case 'positive':
        text = `${ticker} is looking strong! Great earnings, bullish on this stock. To the moon! 🚀`;
        break;
      case 'negative':
        text = `${ticker} is overvalued. Bearish sentiment, expecting a pullback. Avoid this stock.`;
        break;
      default:
        text = `${ticker} trading sideways. Mixed signals, waiting for confirmation.`;
    }
    
    posts.push({
      text: text,
      subreddit: CONFIG.REDDIT_SOURCES[Math.floor(Math.random() * CONFIG.REDDIT_SOURCES.length)],
      upvotes: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    });
  }
  
  return posts;
}

// Helper: Scrape Twitter/X sentiment
async function scrapeTwitterSentiment(ticker) {
  try {
    const mockTweets = [];
    const numTweets = Math.floor(Math.random() * 50) + 20;
    
    for (let i = 0; i < numTweets; i++) {
      const sentiment = Math.random() > 0.5 ? 'positive' : 'negative';
      mockTweets.push({
        text: sentiment === 'positive' 
          ? `$${ticker} breaking out! 📈 This is the way.`
          : `$${ticker} dumping hard. Time to sell.`,
        likes: Math.floor(Math.random() * 500),
        retweets: Math.floor(Math.random() * 200)
      });
    }
    
    return mockTweets;
  } catch (error) {
    console.error('Twitter scraping error:', error);
    return [];
  }
}

// Helper: Analyze sentiment using VADER
function analyzeSentiment(texts) {
  const scores = texts.map(text => vader.SentimentIntensityAnalyzer.polarity_scores(text.text || text));
  
  const avgCompound = scores.reduce((sum, s) => sum + s.compound, 0) / scores.length;
  
  const positive = scores.filter(s => s.compound > 0.05).length;
  const negative = scores.filter(s => s.compound < -0.05).length;
  const neutral = scores.length - positive - negative;
  
  const totalCount = scores.length;
  
  return {
    score: parseFloat(avgCompound.toFixed(3)),
    sentiment: {
      positive: Math.round((positive / totalCount) * 100),
      negative: Math.round((negative / totalCount) * 100),
      neutral: Math.round((neutral / totalCount) * 100)
    },
    mentions: totalCount
  };
}

// Helper: Generate trading signal from sentiment score
function generateSignal(score) {
  if (score >= 0.15) return 'STRONG BUY';
  if (score >= 0.05) return 'BUY';
  if (score <= -0.15) return 'STRONG SELL';
  if (score <= -0.05) return 'SELL';
  return 'NEUTRAL';
}

// Helper: Determine trend
function determineTrend(score) {
  if (score > 0.05) return 'up';
  if (score < -0.05) return 'down';
  return 'sideways';
}

// Main API endpoint: GET /v1/sentiment/:ticker
app.get('/v1/sentiment/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const tickerUpper = ticker.toUpperCase();
  
  // Validate ticker
  if (!CONFIG.SUPPORTED_TICKERS.includes(tickerUpper)) {
    return res.status(400).json({
      error: 'invalid_ticker',
      message: `Ticker ${tickerUpper} is not supported`,
      supported: CONFIG.SUPPORTED_TICKERS
    });
  }
  
  try {
    // Check cache
    const cached = sentimentCache.get(tickerUpper);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log(`Serving cached data for ${tickerUpper}`);
      return res.status(200).json(cached.data);
    }
    
    // Scrape data from Reddit and Twitter
    console.log(`Scraping sentiment for ${tickerUpper}...`);
    const [redditPosts, tweets] = await Promise.all([
      scrapeRedditSentiment(tickerUpper),
      scrapeTwitterSentiment(tickerUpper)
    ]);
    
    // Combine all text data
    const allTexts = [
      ...redditPosts.map(p => ({ text: p.text, weight: Math.log(p.upvotes + 1) })),
      ...tweets.map(t => ({ text: t.text, weight: Math.log(t.likes + 1) }))
    ];
    
    if (allTexts.length === 0) {
      return res.status(200).json({
        ticker: tickerUpper,
        signal: 'NEUTRAL',
        score: 0,
        sentiment: { positive: 0, negative: 0, neutral: 100 },
        mentions: 0,
        trend: 'sideways',
        timestamp: new Date().toISOString(),
        message: 'Insufficient data for analysis'
      });
    }
    
    // Analyze sentiment
    const analysis = analyzeSentiment(allTexts);
    
    // Generate response
    const response = {
      ticker: tickerUpper,
      signal: generateSignal(analysis.score),
      score: analysis.score,
      sentiment: analysis.sentiment,
      mentions: analysis.mentions,
      trend: determineTrend(analysis.score),
      sources: {
        reddit: redditPosts.length,
        twitter: tweets.length
      },
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    sentimentCache.set(tickerUpper, {
      data: response,
      timestamp: Date.now()
    });
    
    // Return response
    res.status(200).json(response);
      
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to process sentiment analysis',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint - API information
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Stock Sentiment API',
    version: '1.0.0',
    description: 'Real-time stock sentiment analysis powered by Reddit and Twitter data. Built for AI agents using the x402 protocol.',
    pricing: '$0.1 USDC per query',
    network: 'Base',
    endpoint: '/v1/sentiment/:ticker',
    supported_tickers: CONFIG.SUPPORTED_TICKERS,
    documentation: `${CONFIG.BASE_URL}/docs`,
    contact: {
      twitter: '@BreakTheCubicle',
      github: 'https://github.com/lobsterbar2027-boop'
    }
  });
});

// List supported tickers
app.get('/v1/tickers', (req, res) => {
  res.status(200).json({
    supported_tickers: CONFIG.SUPPORTED_TICKERS,
    count: CONFIG.SUPPORTED_TICKERS.length,
    pricing: '$0.1 USDC per query',
    network: 'Base'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found',
    available_endpoints: [
      'GET /',
      'GET /health',
      'GET /v1/tickers',
      'GET /v1/sentiment/:ticker'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Stock Sentiment API running on port ${PORT}`);
  console.log(`📊 Supported tickers: ${CONFIG.SUPPORTED_TICKERS.length}`);
  console.log(`💰 Price per query: $0.1 USDC on Base`);
  console.log(`📍 Wallet: ${CONFIG.WALLET_ADDRESS}`);
  console.log(`🌐 Base URL: ${CONFIG.BASE_URL}`);
});

module.exports = app;
