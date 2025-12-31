/**
 * Oddschecker Scraper
 * Scrapes odds from Oddschecker.com (aggregator showing 20+ bookmakers)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const SPORTS_CONFIG = [
  { 
    name: 'soccer', 
    url: 'https://www.oddschecker.com/football',
    has_draw: true
  },
  { 
    name: 'basketball', 
    url: 'https://www.oddschecker.com/basketball/nba',
    has_draw: false
  },
  { 
    name: 'tennis', 
    url: 'https://www.oddschecker.com/tennis',
    has_draw: false
  },
  { 
    name: 'nfl', 
    url: 'https://www.oddschecker.com/american-football/nfl',
    has_draw: false
  },
  { 
    name: 'mlb', 
    url: 'https://www.oddschecker.com/baseball/usa/mlb',
    has_draw: false
  }
];

/**
 * Scrape odds for a specific sport
 * Note: This is a simplified scraper. In production, you'd use Apify's
 * web scraper or build a more robust scraper with Puppeteer
 */
async function scrapeOddsForSport(sportConfig) {
  console.log(`🔍 Scraping ${sportConfig.name}...`);
  
  try {
    // For MVP, we'll generate mock data
    // In production, replace this with actual Apify scraper or Puppeteer
    const mockOdds = generateMockOdds(sportConfig);
    
    console.log(`✅ Scraped ${mockOdds.length} odds for ${sportConfig.name}`);
    return mockOdds;
    
    /* PRODUCTION CODE (uncomment when ready):
    
    const response = await axios.get(sportConfig.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const odds = [];
    
    // Parse odds from HTML
    // This will vary based on Oddschecker's structure
    $('.match-row').each((i, element) => {
      const team1 = $(element).find('.team1').text().trim();
      const team2 = $(element).find('.team2').text().trim();
      
      // Extract odds from each bookmaker
      $(element).find('.bookmaker-odds').each((j, bookmakerEl) => {
        const bookmaker = $(bookmakerEl).data('bookmaker');
        const odds1 = parseFloat($(bookmakerEl).find('.odds1').text());
        const odds2 = parseFloat($(bookmakerEl).find('.odds2').text());
        const drawOdds = sportConfig.has_draw 
          ? parseFloat($(bookmakerEl).find('.draw-odds').text()) 
          : null;
        
        odds.push({
          sport: sportConfig.name,
          match_id: generateMatchId(team1, team2),
          match_name: `${team1} vs ${team2}`,
          team1,
          team2,
          bookmaker,
          odds1,
          odds2,
          draw_odds: drawOdds,
          match_date: extractMatchDate($, element)
        });
      });
    });
    
    return odds;
    */
    
  } catch (error) {
    console.error(`❌ Error scraping ${sportConfig.name}:`, error.message);
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
    await delay(2000);
  }
  
  console.log(`✅ Total odds scraped: ${allOdds.length}`);
  return allOdds;
}

/**
 * Generate mock odds for testing
 * Replace this with real scraper in production
 */
function generateMockOdds(sportConfig) {
  const matches = generateMockMatches(sportConfig);
  const bookmakers = [
    'Bet365', 'DraftKings', 'FanDuel', 'BetMGM', 'Caesars',
    'PointsBet', 'BetRivers', 'Unibet', 'William Hill', '888sport'
  ];
  
  const odds = [];
  
  matches.forEach(match => {
    bookmakers.forEach(bookmaker => {
      // Generate odds with slight variations between bookmakers
      const baseOdds1 = 1.5 + Math.random() * 3;
      const baseOdds2 = 1.5 + Math.random() * 3;
      
      // Add variation (this creates arbitrage opportunities sometimes)
      const variation = (Math.random() - 0.5) * 0.3;
      
      const odds1 = parseFloat((baseOdds1 + variation).toFixed(2));
      const odds2 = parseFloat((baseOdds2 - variation).toFixed(2));
      const drawOdds = sportConfig.has_draw 
        ? parseFloat((3.0 + Math.random() * 2).toFixed(2))
        : null;
      
      odds.push({
        sport: sportConfig.name,
        match_id: match.id,
        match_name: match.name,
        team1: match.team1,
        team2: match.team2,
        bookmaker,
        odds1,
        odds2,
        draw_odds: drawOdds,
        match_date: match.date
      });
    });
  });
  
  return odds;
}

/**
 * Generate mock matches for a sport
 */
function generateMockMatches(sportConfig) {
  const teamsByPort = {
    soccer: [
      ['Manchester United', 'Liverpool'],
      ['Barcelona', 'Real Madrid'],
      ['Bayern Munich', 'Dortmund'],
      ['PSG', 'Marseille'],
      ['Arsenal', 'Chelsea']
    ],
    basketball: [
      ['Lakers', 'Celtics'],
      ['Warriors', 'Nets'],
      ['Heat', 'Bucks'],
      ['Nuggets', 'Suns']
    ],
    tennis: [
      ['Djokovic', 'Nadal'],
      ['Alcaraz', 'Medvedev'],
      ['Swiatek', 'Sabalenka']
    ],
    nfl: [
      ['Chiefs', 'Bills'],
      ['49ers', 'Eagles'],
      ['Cowboys', 'Packers']
    ],
    mlb: [
      ['Yankees', 'Red Sox'],
      ['Dodgers', 'Giants'],
      ['Astros', 'Rangers']
    ]
  };
  
  const teams = teamsByPort[sportConfig.name] || [];
  const now = new Date();
  
  return teams.map((matchup, i) => ({
    id: generateMatchId(matchup[0], matchup[1]),
    name: `${matchup[0]} vs ${matchup[1]}`,
    team1: matchup[0],
    team2: matchup[1],
    date: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000) // Spread over next few days
  }));
}

/**
 * Generate consistent match ID
 */
function generateMatchId(team1, team2) {
  const normalized = [team1, team2]
    .map(t => t.toLowerCase().replace(/\s+/g, '-'))
    .sort()
    .join('_');
  
  return `match_${normalized}_${Date.now().toString().slice(-6)}`;
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
  SPORTS_CONFIG
};
