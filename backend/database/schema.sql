-- Database schema for ArbitrageEdge

-- Odds table - stores current odds from all bookmakers
CREATE TABLE IF NOT EXISTS odds (
    id SERIAL PRIMARY KEY,
    sport VARCHAR(50) NOT NULL,
    match_id VARCHAR(255) NOT NULL,
    match_name VARCHAR(500) NOT NULL,
    team1 VARCHAR(255) NOT NULL,
    team2 VARCHAR(255) NOT NULL,
    bookmaker VARCHAR(100) NOT NULL,
    odds1 DECIMAL(6,2) NOT NULL,
    odds2 DECIMAL(6,2) NOT NULL,
    draw_odds DECIMAL(6,2),
    match_date TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, bookmaker)
);

-- Arbitrage opportunities table
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(255) NOT NULL,
    sport VARCHAR(50) NOT NULL,
    match_name VARCHAR(500) NOT NULL,
    team1 VARCHAR(255) NOT NULL,
    team2 VARCHAR(255) NOT NULL,
    profit_percentage DECIMAL(5,2) NOT NULL,
    bet1_bookmaker VARCHAR(100) NOT NULL,
    bet1_odds DECIMAL(6,2) NOT NULL,
    bet1_stake_pct DECIMAL(5,2) NOT NULL,
    bet2_bookmaker VARCHAR(100) NOT NULL,
    bet2_odds DECIMAL(6,2) NOT NULL,
    bet2_stake_pct DECIMAL(5,2) NOT NULL,
    bet3_bookmaker VARCHAR(100),
    bet3_odds DECIMAL(6,2),
    bet3_stake_pct DECIMAL(5,2),
    detected_at TIMESTAMP DEFAULT NOW(),
    expired BOOLEAN DEFAULT FALSE
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    key VARCHAR(100) PRIMARY KEY,
    user_email VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'free',
    requests_used INT DEFAULT 0,
    requests_limit INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_odds_sport_date ON odds(sport, match_date);
CREATE INDEX IF NOT EXISTS idx_odds_match ON odds(match_id);
CREATE INDEX IF NOT EXISTS idx_odds_scraped ON odds(scraped_at);
CREATE INDEX IF NOT EXISTS idx_arb_sport ON arbitrage_opportunities(sport, detected_at);
CREATE INDEX IF NOT EXISTS idx_arb_profit ON arbitrage_opportunities(profit_percentage DESC);

-- Insert a demo API key
INSERT INTO api_keys (key, user_email, tier, requests_limit) 
VALUES ('demo_key_12345', 'demo@arbitrageedge.com', 'pro', 10000)
ON CONFLICT (key) DO NOTHING;
