/**
 * Scraper Scheduler
 * Runs odds scraping and arbitrage detection every 5 minutes
 */

const cron = require('node-cron');
const { scrapeAllSports } = require('./oddschecker');
const { storeOdds, getActiveMatches, storeArbitrage, cleanupOldData, getMatchOdds } = require('../database/queries');
const { calculateArbitrage } = require('../calculator/arbitrage');

/**
 * Main scraping job
 */
async function runScrapingJob() {
  console.log('⏰ Starting scheduled scraping job...');
  
  try {
    // 1. Scrape all sports
    const allOdds = await scrapeAllSports();
    
    if (allOdds.length === 0) {
      console.log('⚠️  No odds scraped, skipping...');
      return;
    }
    
    // 2. Store odds in database
    await storeOdds(allOdds);
    
    // 3. Detect arbitrage opportunities
    await detectArbitrageOpportunities();
    
    console.log('✅ Scraping job complete!');
  } catch (error) {
    console.error('❌ Scraping job failed:', error);
  }
}

/**
 * Detect arbitrage opportunities from stored odds
 */
async function detectArbitrageOpportunities() {
  console.log('🔍 Detecting arbitrage opportunities...');
  
  try {
    // Get all active matches
    const matches = await getActiveMatches();
    
    let arbitragesFound = 0;
    
    for (const match of matches) {
      // Get all odds for this match
      const odds = await getMatchOdds(match.match_id);
      
      if (odds.length < 2) continue;
      
      // Calculate if arbitrage exists
      const arbitrage = calculateArbitrage(odds);
      
      if (arbitrage && arbitrage.exists) {
        // Store the arbitrage opportunity
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
        console.log(`💰 Found arbitrage: ${match.match_name} - ${arbitrage.profit_percentage}% profit`);
      }
    }
    
    console.log(`✅ Found ${arbitragesFound} arbitrage opportunities`);
  } catch (error) {
    console.error('❌ Error detecting arbitrage:', error);
  }
}

/**
 * Cleanup job - runs every hour
 */
async function runCleanupJob() {
  console.log('🧹 Running cleanup job...');
  await cleanupOldData();
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('🚀 Starting ArbitrageEdge Scheduler...');
  
  // Run scraping job every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    runScrapingJob();
  });
  
  // Run cleanup job every hour
  cron.schedule('0 * * * *', () => {
    runCleanupJob();
  });
  
  // Run immediately on start
  runScrapingJob();
  
  console.log('✅ Scheduler started!');
  console.log('📅 Scraping every 5 minutes');
  console.log('🧹 Cleanup every hour');
}

// If run directly
if (require.main === module) {
  startScheduler();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down scheduler...');
    process.exit(0);
  });
}

module.exports = {
  startScheduler,
  runScrapingJob,
  runCleanupJob
};
