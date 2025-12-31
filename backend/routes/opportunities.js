/**
 * API Routes - Arbitrage Opportunities
 */

const express = require('express');
const router = express.Router();
const { getArbitrageOpportunities } = require('../database/queries');
const { calculateStakeAmounts } = require('../calculator/arbitrage');

/**
 * GET /api/opportunities
 * Get current arbitrage opportunities
 * 
 * Query params:
 * - sport: Filter by sport (soccer, basketball, tennis, nfl, mlb)
 * - min_profit: Minimum profit percentage (e.g., 1.5)
 * - stake: Calculate exact stake amounts for this total stake
 */
router.get('/', async (req, res) => {
  try {
    const { sport, min_profit, stake } = req.query;
    
    const filters = {};
    
    if (sport) {
      filters.sport = sport;
    }
    
    if (min_profit) {
      filters.min_profit = parseFloat(min_profit);
    }
    
    // Get arbitrage opportunities
    const opportunities = await getArbitrageOpportunities(filters);
    
    // Format response
    const formattedOpportunities = opportunities.map(opp => {
      const formatted = {
        id: opp.id,
        match: {
          id: opp.match_id,
          name: opp.match_name,
          sport: opp.sport,
          team1: opp.team1,
          team2: opp.team2
        },
        profit_percentage: parseFloat(opp.profit_percentage),
        bets: [
          {
            outcome: opp.team1,
            bookmaker: opp.bet1_bookmaker,
            odds: parseFloat(opp.bet1_odds),
            stake_percentage: parseFloat(opp.bet1_stake_pct)
          },
          {
            outcome: opp.bet2_bookmaker === opp.bet3_bookmaker ? 'Draw' : opp.team2,
            bookmaker: opp.bet2_bookmaker,
            odds: parseFloat(opp.bet2_odds),
            stake_percentage: parseFloat(opp.bet2_stake_pct)
          }
        ],
        detected_at: opp.detected_at
      };
      
      // Add third bet if exists (3-way betting)
      if (opp.bet3_bookmaker) {
        formatted.bets.push({
          outcome: opp.team2,
          bookmaker: opp.bet3_bookmaker,
          odds: parseFloat(opp.bet3_odds),
          stake_percentage: parseFloat(opp.bet3_stake_pct)
        });
      }
      
      // Calculate exact stake amounts if requested
      if (stake) {
        const stakeAmount = parseFloat(stake);
        formatted.bets = formatted.bets.map(bet => ({
          ...bet,
          stake_amount: parseFloat((stakeAmount * bet.stake_percentage / 100).toFixed(2)),
          potential_return: parseFloat((stakeAmount * bet.stake_percentage / 100 * bet.odds).toFixed(2))
        }));
        
        formatted.total_stake = stakeAmount;
        formatted.guaranteed_profit = parseFloat((stakeAmount * formatted.profit_percentage / 100).toFixed(2));
      }
      
      return formatted;
    });
    
    res.json({
      success: true,
      count: formattedOpportunities.length,
      opportunities: formattedOpportunities,
      filters: {
        sport: sport || 'all',
        min_profit: min_profit ? parseFloat(min_profit) : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch arbitrage opportunities',
      message: error.message
    });
  }
});

/**
 * GET /api/opportunities/:id
 * Get specific arbitrage opportunity by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stake } = req.query;
    
    const opportunities = await getArbitrageOpportunities({});
    const opportunity = opportunities.find(opp => opp.id === parseInt(id));
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
        message: 'The requested arbitrage opportunity does not exist or has expired'
      });
    }
    
    // Format single opportunity
    const formatted = {
      id: opportunity.id,
      match: {
        id: opportunity.match_id,
        name: opportunity.match_name,
        sport: opportunity.sport,
        team1: opportunity.team1,
        team2: opportunity.team2
      },
      profit_percentage: parseFloat(opportunity.profit_percentage),
      bets: [
        {
          outcome: opportunity.team1,
          bookmaker: opportunity.bet1_bookmaker,
          odds: parseFloat(opportunity.bet1_odds),
          stake_percentage: parseFloat(opportunity.bet1_stake_pct)
        },
        {
          outcome: opportunity.bet2_bookmaker === opportunity.bet3_bookmaker ? 'Draw' : opportunity.team2,
          bookmaker: opportunity.bet2_bookmaker,
          odds: parseFloat(opportunity.bet2_odds),
          stake_percentage: parseFloat(opportunity.bet2_stake_pct)
        }
      ],
      detected_at: opportunity.detected_at
    };
    
    if (opportunity.bet3_bookmaker) {
      formatted.bets.push({
        outcome: opportunity.team2,
        bookmaker: opportunity.bet3_bookmaker,
        odds: parseFloat(opportunity.bet3_odds),
        stake_percentage: parseFloat(opportunity.bet3_stake_pct)
      });
    }
    
    if (stake) {
      const stakeAmount = parseFloat(stake);
      formatted.bets = formatted.bets.map(bet => ({
        ...bet,
        stake_amount: parseFloat((stakeAmount * bet.stake_percentage / 100).toFixed(2)),
        potential_return: parseFloat((stakeAmount * bet.stake_percentage / 100 * bet.odds).toFixed(2))
      }));
      
      formatted.total_stake = stakeAmount;
      formatted.guaranteed_profit = parseFloat((stakeAmount * formatted.profit_percentage / 100).toFixed(2));
    }
    
    res.json({
      success: true,
      opportunity: formatted
    });
    
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunity',
      message: error.message
    });
  }
});

/**
 * GET /api/sports
 * Get list of available sports
 */
router.get('/sports/list', async (req, res) => {
  res.json({
    success: true,
    sports: [
      { id: 'soccer', name: 'Soccer', betting_type: '3-way' },
      { id: 'basketball', name: 'Basketball (NBA)', betting_type: '2-way' },
      { id: 'tennis', name: 'Tennis', betting_type: '2-way' },
      { id: 'nfl', name: 'American Football (NFL)', betting_type: '2-way' },
      { id: 'mlb', name: 'Baseball (MLB)', betting_type: '2-way' }
    ]
  });
});

module.exports = router;
