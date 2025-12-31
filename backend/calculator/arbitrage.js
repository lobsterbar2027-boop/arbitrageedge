/**
 * Arbitrage Calculator
 * Detects arbitrage opportunities and calculates optimal stake distribution
 */

/**
 * Calculate if arbitrage exists for a given set of odds
 * @param {Array} odds - Array of odds objects with bookmaker and odds values
 * @returns {Object} - Arbitrage details or null
 */
function calculateArbitrage(odds) {
  if (!odds || odds.length < 2) {
    return null;
  }
  
  // Determine if this is 2-way or 3-way betting
  const hasDrawOdds = odds.some(o => o.draw_odds && o.draw_odds > 0);
  
  if (hasDrawOdds) {
    return calculate3WayArbitrage(odds);
  } else {
    return calculate2WayArbitrage(odds);
  }
}

/**
 * Calculate 2-way arbitrage (e.g., Tennis, NBA)
 */
function calculate2WayArbitrage(odds) {
  // Find best odds for each outcome
  let bestOdds1 = { odds: 0, bookmaker: null };
  let bestOdds2 = { odds: 0, bookmaker: null };
  
  for (const odd of odds) {
    if (odd.odds1 > bestOdds1.odds) {
      bestOdds1 = { odds: odd.odds1, bookmaker: odd.bookmaker };
    }
    if (odd.odds2 > bestOdds2.odds) {
      bestOdds2 = { odds: odd.odds2, bookmaker: odd.bookmaker };
    }
  }
  
  // Calculate implied probabilities
  const impliedProb1 = 1 / bestOdds1.odds;
  const impliedProb2 = 1 / bestOdds2.odds;
  const totalImpliedProb = impliedProb1 + impliedProb2;
  
  // Check if arbitrage exists (total implied probability < 1)
  if (totalImpliedProb >= 1.0) {
    return null;
  }
  
  // Calculate profit percentage
  const profitPercentage = ((1 / totalImpliedProb) - 1) * 100;
  
  // Calculate stake percentages (what % of total stake to place on each bet)
  const stake1Pct = (impliedProb1 / totalImpliedProb) * 100;
  const stake2Pct = (impliedProb2 / totalImpliedProb) * 100;
  
  return {
    exists: true,
    profit_percentage: parseFloat(profitPercentage.toFixed(2)),
    bets: [
      {
        outcome: odds[0].team1,
        bookmaker: bestOdds1.bookmaker,
        odds: bestOdds1.odds,
        stake_pct: parseFloat(stake1Pct.toFixed(2))
      },
      {
        outcome: odds[0].team2,
        bookmaker: bestOdds2.bookmaker,
        odds: bestOdds2.odds,
        stake_pct: parseFloat(stake2Pct.toFixed(2))
      }
    ]
  };
}

/**
 * Calculate 3-way arbitrage (e.g., Soccer, Hockey)
 */
function calculate3WayArbitrage(odds) {
  // Find best odds for each outcome
  let bestOdds1 = { odds: 0, bookmaker: null };
  let bestOdds2 = { odds: 0, bookmaker: null };
  let bestDraw = { odds: 0, bookmaker: null };
  
  for (const odd of odds) {
    if (odd.odds1 > bestOdds1.odds) {
      bestOdds1 = { odds: odd.odds1, bookmaker: odd.bookmaker };
    }
    if (odd.odds2 > bestOdds2.odds) {
      bestOdds2 = { odds: odd.odds2, bookmaker: odd.bookmaker };
    }
    if (odd.draw_odds && odd.draw_odds > bestDraw.odds) {
      bestDraw = { odds: odd.draw_odds, bookmaker: odd.bookmaker };
    }
  }
  
  // Need valid odds for all three outcomes
  if (bestOdds1.odds === 0 || bestOdds2.odds === 0 || bestDraw.odds === 0) {
    return null;
  }
  
  // Calculate implied probabilities
  const impliedProb1 = 1 / bestOdds1.odds;
  const impliedProb2 = 1 / bestOdds2.odds;
  const impliedProbDraw = 1 / bestDraw.odds;
  const totalImpliedProb = impliedProb1 + impliedProb2 + impliedProbDraw;
  
  // Check if arbitrage exists
  if (totalImpliedProb >= 1.0) {
    return null;
  }
  
  // Calculate profit percentage
  const profitPercentage = ((1 / totalImpliedProb) - 1) * 100;
  
  // Calculate stake percentages
  const stake1Pct = (impliedProb1 / totalImpliedProb) * 100;
  const stake2Pct = (impliedProb2 / totalImpliedProb) * 100;
  const stakeDrawPct = (impliedProbDraw / totalImpliedProb) * 100;
  
  return {
    exists: true,
    profit_percentage: parseFloat(profitPercentage.toFixed(2)),
    bets: [
      {
        outcome: odds[0].team1,
        bookmaker: bestOdds1.bookmaker,
        odds: bestOdds1.odds,
        stake_pct: parseFloat(stake1Pct.toFixed(2))
      },
      {
        outcome: 'Draw',
        bookmaker: bestDraw.bookmaker,
        odds: bestDraw.odds,
        stake_pct: parseFloat(stakeDrawPct.toFixed(2))
      },
      {
        outcome: odds[0].team2,
        bookmaker: bestOdds2.bookmaker,
        odds: bestOdds2.odds,
        stake_pct: parseFloat(stake2Pct.toFixed(2))
      }
    ]
  };
}

/**
 * Calculate exact stake amounts for a given total stake
 * @param {Object} arbitrage - Arbitrage opportunity
 * @param {number} totalStake - Total amount to invest
 * @returns {Array} - Stake amounts for each bet
 */
function calculateStakeAmounts(arbitrage, totalStake) {
  return arbitrage.bets.map(bet => ({
    ...bet,
    stake_amount: parseFloat((totalStake * bet.stake_pct / 100).toFixed(2)),
    potential_return: parseFloat((totalStake * bet.stake_pct / 100 * bet.odds).toFixed(2))
  }));
}

module.exports = {
  calculateArbitrage,
  calculateStakeAmounts
};
