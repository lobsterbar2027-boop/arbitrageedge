/**
 * Odds Scraper - Uses The Odds API for real-time odds
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Map our sports to The Odds API sport keys
const SPORTS_CONFIG = [
  { 
    name: 'soccer', 
    api_key: 'soccer_epl',  // English Premier League
    has_draw: true,
    display_name: 'Soccer - Premier League'
  },
  { 
    name: 'basketball', 
    api_key: 'basketball_nba',
    has_draw: false,
    display_name: 'NBA Basketball'
  },
  { 
    name: 'tennis', 
    api_key: 'tennis_atp',
    has_draw: false,
    display_name: 'Tennis - ATP'
  },
  { 
    name: 'nfl', 
    api_key: 'americanfootball_nfl',
    has_draw: false,
    display_name: 'NFL'
  },
  { 
    name: 'mlb', 
    api_key: 'baseball_mlb',
    has_draw: false,
    display_name: 'MLB Baseball'
  }
];

/**
 * Scrape odds for a specific sport using The Odds API
 */
async function scrapeOddsForSport(sportConfig) {
  console.log(`🔍 Scraping ${sportConfig.display_name}...`);
  
  if (!ODDS_API_KEY) {
    console.error('❌ ODDS_API_KEY not set in environment variables');
    return [];
  }
  
  try {
    const url = `${ODDS_API_BASE}/sports/${sportConfig.api_key}/odds`;
    
    const response = await axios.get(url, {
      params: {
        apiKey: ODDS_API_KEY,
        regions: 'us,uk',  // Get US and UK bookmakers
        markets: 'h2h',    // Head-to-head (match winner)
        oddsFormat: 'decimal'
      }
    });
    
    const games = response.data;
    
    if (!games || games.length === 0) {
      console.log(`ℹ️ No games found for ${sportConfig.name}`);
      return [];
    }
    
    // Convert The Odds API format to our format
    const allOdds = [];
    
    for (const game of games) {
      const matchId = generateMatchId(game.home_team, game.away_team);
      const matchName = `${game.home_team} vs ${game.away_team}`;
      
      // Process each bookmaker's odds
      for (const bookmaker of game.bookmakers) {
        const market = bookmaker.markets.find(m => m.key === 'h2h');
        
        if (!market || !market.outcomes) continue;
        
        // Find odds for each outcome
        const homeOutcome = market.outcomes.find(o => o.name === game.home_team);
        const awayOutcome = market.outcomes.find(o => o.name === game.away_team);
        const drawOutcome = market.outcomes.find(o => o.name === 'Draw');
        
        if (!homeOutcome || !awayOutcome) continue;
        
        allOdds.push({
          sport: sportConfig.name,
          match_id: matchId,
          match_name: matchName,
          team1: game.home_team,
          team2: game.away_team,
          bookmaker: bookmaker.title,
          odds1: parseFloat(homeOutcome.price),
          odds2: parseFloat(awayOutcome.price),
          draw_odds: drawOutcome ? parseFloat(drawOutcome.price) : null,
          match_date: new Date(game.commence_time)
        });
      }
    }
    
    console.log(`✅ Scraped ${allOdds.length} odds records for ${sportConfig.name}`);
    return allOdds;
    
  } catch (error) {
    console.error(`❌ Error scraping ${sportConfig.name}:`, error.message);
    
    // Show more details if it's an API error
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response:', error.response.data);
    }
    
    return [];
  }
}

/**
 * Scrape all configured sports
 */
async function scrapeAllSports() {
  console.log('🚀 Starting scrape for all sports...');
  
  const allOdds = [];
  
  for (const sport of SPORTS_CONFIG) {
    const odds = await scrapeOddsForSport(sport);
    allOdds.push(...odds);
    
    // Small delay to avoid rate limiting
    await delay(1000);
  }
  
  console.log(`✅ Total odds scraped: ${allOdds.length}`);
  return allOdds;
}

/**
 * Get list of available sports from The Odds API
 */
async function getAvailableSports() {
  try {
    const response = await axios.get(`${ODDS_API_BASE}/sports`, {
      params: {
        apiKey: ODDS_API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching sports:', error.message);
    return [];
  }
}

/**
 * Generate consistent match ID
 */
function generateMatchId(team1, team2) {
  const normalized = [team1, team2]
    .map(t => t.toLowerCase().replace(/\s+/g, '-'))
    .sort()
    .join('_');
  
  return `match_${normalized}`;
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  scrapeAllSports,
  scrapeOddsForSport,
  getAvailableSports,
  SPORTS_CONFIG
};
