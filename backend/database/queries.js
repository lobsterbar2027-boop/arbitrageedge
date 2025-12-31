const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Store odds in database
async function storeOdds(oddsArray) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const odds of oddsArray) {
      await client.query(`
        INSERT INTO odds (
          sport, match_id, match_name, team1, team2, 
          bookmaker, odds1, odds2, draw_odds, match_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (match_id, bookmaker) 
        DO UPDATE SET 
          odds1 = EXCLUDED.odds1,
          odds2 = EXCLUDED.odds2,
          draw_odds = EXCLUDED.draw_odds,
          scraped_at = NOW()
      `, [
        odds.sport,
        odds.match_id,
        odds.match_name,
        odds.team1,
        odds.team2,
        odds.bookmaker,
        odds.odds1,
        odds.odds2,
        odds.draw_odds,
        odds.match_date
      ]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ Stored ${oddsArray.length} odds records`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error storing odds:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get odds for a specific match
async function getMatchOdds(matchId) {
  const result = await pool.query(`
    SELECT * FROM odds 
    WHERE match_id = $1 
    ORDER BY bookmaker
  `, [matchId]);
  
  return result.rows;
}

// Get all active matches
async function getActiveMatches(sport = null) {
  let query = `
    SELECT DISTINCT 
      match_id, sport, match_name, team1, team2, match_date
    FROM odds
    WHERE scraped_at > NOW() - INTERVAL '2 hours'
  `;
  
  const params = [];
  
  if (sport) {
    query += ' AND sport = $1';
    params.push(sport);
  }
  
  query += ' ORDER BY match_date';
  
  const result = await pool.query(query, params);
  return result.rows;
}

// Store arbitrage opportunity
async function storeArbitrage(arb) {
  const result = await pool.query(`
    INSERT INTO arbitrage_opportunities (
      match_id, sport, match_name, team1, team2,
      profit_percentage,
      bet1_bookmaker, bet1_odds, bet1_stake_pct,
      bet2_bookmaker, bet2_odds, bet2_stake_pct,
      bet3_bookmaker, bet3_odds, bet3_stake_pct
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `, [
    arb.match_id,
    arb.sport,
    arb.match_name,
    arb.team1,
    arb.team2,
    arb.profit_percentage,
    arb.bets[0].bookmaker,
    arb.bets[0].odds,
    arb.bets[0].stake_pct,
    arb.bets[1].bookmaker,
    arb.bets[1].odds,
    arb.bets[1].stake_pct,
    arb.bets[2]?.bookmaker,
    arb.bets[2]?.odds,
    arb.bets[2]?.stake_pct
  ]);
  
  return result.rows[0];
}

// Get arbitrage opportunities
async function getArbitrageOpportunities(filters = {}) {
  let query = `
    SELECT * FROM arbitrage_opportunities
    WHERE expired = FALSE
      AND detected_at > NOW() - INTERVAL '1 hour'
  `;
  
  const params = [];
  let paramCount = 1;
  
  if (filters.sport) {
    query += ` AND sport = $${paramCount}`;
    params.push(filters.sport);
    paramCount++;
  }
  
  if (filters.min_profit) {
    query += ` AND profit_percentage >= $${paramCount}`;
    params.push(filters.min_profit);
    paramCount++;
  }
  
  query += ' ORDER BY profit_percentage DESC LIMIT 50';
  
  const result = await pool.query(query, params);
  return result.rows;
}

// Cleanup old data
async function cleanupOldData() {
  const client = await pool.connect();
  
  try {
    // Delete odds older than 3 hours
    const oddsResult = await client.query(`
      DELETE FROM odds 
      WHERE scraped_at < NOW() - INTERVAL '3 hours'
    `);
    
    // Delete arbitrage opportunities older than 24 hours
    const arbResult = await client.query(`
      DELETE FROM arbitrage_opportunities 
      WHERE detected_at < NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`🧹 Cleanup: Deleted ${oddsResult.rowCount} old odds, ${arbResult.rowCount} old opportunities`);
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    client.release();
  }
}

// Validate API key
async function validateApiKey(key) {
  const result = await pool.query(`
    SELECT * FROM api_keys WHERE key = $1
  `, [key]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const apiKey = result.rows[0];
  
  // Check if over limit
  if (apiKey.requests_used >= apiKey.requests_limit) {
    return { valid: false, message: 'Rate limit exceeded' };
  }
  
  return { valid: true, ...apiKey };
}

// Increment API key usage
async function incrementApiKeyUsage(key) {
  await pool.query(`
    UPDATE api_keys 
    SET requests_used = requests_used + 1,
        last_used_at = NOW()
    WHERE key = $1
  `, [key]);
}

module.exports = {
  pool,
  storeOdds,
  getMatchOdds,
  getActiveMatches,
  storeArbitrage,
  getArbitrageOpportunities,
  cleanupOldData,
  validateApiKey,
  incrementApiKeyUsage
};
