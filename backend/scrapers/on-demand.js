/**
 * On-Demand Scraper
 * Only scrapes when API is called and data is stale
 */

const { scrapeAllSports } = require('./oddschecker');
const { storeOdds, getActiveMatches, cleanupOldData, getMatchOdds } = require('../database/queries');
const { calculateArbitrage } = require('../calculator/arbitrage');
const { storeArbitrage } = require('../database/queries');

// Cache status
let lastScrapeTime = null;
let isScraping = false;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Check if we need fresh data
 */
function needsFreshData() {
  if (!lastScrapeTime) return true;
  
  const timeSinceLastScrape = Date.now() - lastScrapeTime;
  return timeSinceLastScrape > CACHE_DURATION;
}

/**
 * Get fresh data (scrape if needed)
 */
async function getOrScrapeData() {
  // If data is fresh, just return existing
  if (!needsFreshData()) {
    const cacheAge = Math.round((Date.now() - lastScrapeTime) / 1000 / 60);
    console.log(`✅ Using cached data (${cacheAge} minutes old)`);
    return { scraped: false, cacheAge };
  }
  
  // If already scraping, wait for it
  if (isScraping) {
    console.log('⏳ Scrape already in progress, waiting...');
    await waitForScrape();
    return { scraped: false, waited: true };
  }
  
  // Scrape now
  try {
    isScraping = true;
    console.log('🔄 Data is stale, scraping now...');
    console.log('💰 This counts as 1 Odds API request');
    
    // Scrape all sports
    const allOdds = await scrapeAllSports();
    
    if (allOdds.length === 0) {
      console.log('⚠️ No odds scraped');
      isScraping = false;
      return { scraped: true, error: 'No odds found' };
    }
    
    // Store odds
    await storeOdds(allOdds);
    
    // Detect arbitrage
    await detectArbitrageOpportunities();
    
    // Update last scrape time
    lastScrapeTime = Date.now();
    
    console.log(`✅ Scraped ${allOdds.length} odds successfully`);
    console.log(`📊 Cache valid for next 30 minutes`);
    
    isScraping = false;
    return { scraped: true, oddsCount: allOdds.length };
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    isScraping = false;
    throw error;
  }
}

/**
 * Detect arbitrage from stored odds
 */
async function detectArbitrageOpportunities() {
  console.log('🔍 Detecting arbitrage opportunities...');
  
  try {
    const matches = await getActiveMatches();
    let arbitragesFound = 0;
    
    for (const match of matches) {
      const odds = await getMatchOdds(match.match_id);
      
      if (odds.length < 2) continue;
      
      const arbitrage = calculateArbitrage(odds);
      
      if (arbitrage && arbitrage.exists) {
        await storeArbitrage({
          match_id: match.match_id,
          sport: match.sport,
          match_name: match.match_name,
          team1: match.team1,
          team2: match.team2,
          profit_percentage: arbitrage.profit_percentage,
          bets: arbitrage.bets
        });
        
        arbitragesFound++;
        console.log(`💰 Found: ${match.match_name} - ${arbitrage.profit_percentage}% profit`);
      }
    }
    
    console.log(`✅ Total arbitrage opportunities: ${arbitragesFound}`);
    
  } catch (error) {
    console.error('❌ Error detecting arbitrage:', error);
  }
}

/**
 * Wait for ongoing scrape to finish
 */
async function waitForScrape() {
  let waited = 0;
  const maxWait = 60000; // 60 seconds max
  
  while (isScraping && waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    waited += 1000;
  }
}

/**
 * Force cleanup old data
 */
async function forceCleanup() {
  console.log('🧹 Cleaning up old data...');
  await cleanupOldData();
}

module.exports = {
  getOrScrapeData,
  needsFreshData,
  forceCleanup
};
