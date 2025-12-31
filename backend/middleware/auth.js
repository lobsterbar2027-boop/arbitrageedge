/**
 * Authentication Middleware
 * Validates API keys and tracks usage
 */

const { validateApiKey, incrementApiKeyUsage } = require('../database/queries');

/**
 * Middleware to validate API key
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      message: 'Please provide an API key in the X-API-Key header'
    });
  }
  
  try {
    const validation = await validateApiKey(apiKey);
    
    if (!validation) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }
    
    if (!validation.valid) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: validation.message || 'You have exceeded your API request limit'
      });
    }
    
    // Attach API key info to request
    req.apiKey = validation;
    
    // Increment usage counter
    await incrementApiKeyUsage(apiKey);
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred while validating your API key'
    });
  }
}

/**
 * Optional auth - for public endpoints with premium features
 */
async function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    req.apiKey = { tier: 'free', requests_limit: 10 };
    return next();
  }
  
  try {
    const validation = await validateApiKey(apiKey);
    
    if (validation && validation.valid) {
      req.apiKey = validation;
      await incrementApiKeyUsage(apiKey);
    } else {
      req.apiKey = { tier: 'free', requests_limit: 10 };
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.apiKey = { tier: 'free', requests_limit: 10 };
    next();
  }
}

module.exports = {
  authenticateApiKey,
  optionalAuth
};
