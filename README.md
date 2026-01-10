# ArbitrageEdge API 🎯

**Profit Regardless of the Outcome**
     
Real-time sports betting arbitrage API that finds guaranteed profit opportunities across 20+ bookmakers.

## 🚀 Features

- ⚡ **Real-time odds** updated every 5 minutes
- 🎯 **Guaranteed profit** - mathematical certainty
- 🏆 **5 major sports** - Soccer, NBA, Tennis, NFL, MLB
- 📊 **Smart filtering** - by sport, profit %, stake amount
- 💰 **Stake calculator** - exact bet amounts for each bookmaker
- 🔄 **Auto-cleanup** - database stays lean and fast
- 🤖 **x402 payment support** - AI agents can pay with USDC
- 🔑 **Dual auth** - API keys OR crypto payments

# ArbitrageEdge API 🎯

[![x402](https://img.shields.io/badge/x402-enabled-00ff88?style=for-the-badge)](https://x402.coinbase.com)
[![Live](https://img.shields.io/badge/🌐_Live-API-00d4ff?style=for-the-badge)](https://arbitrageedge-production.up.railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**🌐 Live Site:** https://arbitrageedge-production.up.railway.app

**📡 API Endpoint:** https://arbitrageedge-production.up.railway.app/api

**❤️ Health Check:** https://arbitrageedge-production.up.railway.app/health


## 📁 Project Structure

```
arbitrage-edge/
├── backend/
│   ├── server.js              # Express API server
│   ├── routes/
│   │   └── opportunities.js   # API endpoints
│   ├── scrapers/
│   │   ├── oddschecker.js     # Odds scraper
│   │   └── scheduler.js       # Runs every 5 min
│   ├── calculator/
│   │   └── arbitrage.js       # Math logic
│   ├── database/
│   │   ├── schema.sql         # DB setup
│   │   ├── setup.js           # DB initialization
│   │   └── queries.js         # DB operations
│   └── middleware/
│       └── auth.js            # API key auth
├── frontend/
│   └── index.html             # Landing page
├── .env.example               # Environment template
├── package.json
├── railway.json               # Railway config
└── README.md
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Express API Server            │
│    - Authentication                     │
│    - Rate limiting                      │
│    - /api/opportunities endpoints       │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼────┐        ┌──────▼──────┐
│ Cron   │        │  PostgreSQL │
│ Jobs   │        │  Database   │
│        │        │             │
│ Every  │◄───────┤ - odds      │
│ 5 min  │        │ - arbitrage │
└───┬────┘        │ - api_keys  │
    │             └─────────────┘
    │
┌───▼────────────────┐
│ Oddschecker        │
│ Scraper            │
│ (Mock data for MVP)│
└────────────────────┘
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Railway provides this)
- Git

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/arbitrage-edge.git
cd arbitrage-edge
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL
```

4. **Set up database**
```bash
npm run setup-db
```

5. **Start the server**
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

6. **Test the API**
```bash
# Health check
curl http://localhost:3000/health

# Get arbitrage opportunities (using demo key)
curl -H "X-API-Key: demo_key_12345" \
  http://localhost:3000/api/opportunities

# Filter by sport
curl -H "X-API-Key: demo_key_12345" \
  http://localhost:3000/api/opportunities?sport=soccer

# Calculate stakes
curl -H "X-API-Key: demo_key_12345" \
  http://localhost:3000/api/opportunities?stake=100
```

## 🚂 Deploy to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your repository

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `arbitrage-edge`
4. Railway auto-detects settings

### Step 3: Add PostgreSQL Database
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically sets `DATABASE_URL`

### Step 4: Configure Environment Variables
In Railway dashboard, add:
```
PORT=3000
NODE_ENV=production
ENABLE_SCHEDULER=true
```

### Step 5: Deploy
1. Railway auto-deploys on git push
2. Your API will be live at: `https://your-app.railway.app`

### Step 6: Initialize Database
After first deploy, run once:
```bash
# In Railway's terminal or locally with production DB
npm run setup-db
```

## 📡 API Documentation

### Authentication

ArbitrageEdge supports **two authentication methods**:

#### Method 1: API Keys (Traditional)
Best for human developers and traditional integrations.

**Header:**
```
X-API-Key: your_api_key_here
```

**Demo Key:** `demo_key_12345`

#### Method 2: x402 Payment Protocol (AI Agents)
Best for AI agents that want instant access without signup.

**How it works:**
1. Agent makes request without API key
2. Server responds with `402 Payment Required`
3. Agent pays $0.01 USDC on Base network
4. Server verifies and returns data

**Supported Networks:**
- Base (eip155:8453) - Fee-free USDC via Coinbase
- Solana (solana:mainnet)

**Pricing:**
- `/api/opportunities` → $0.03 per request
- `/api/opportunities/:id` → $0.01 per request

**See [X402_SETUP.md](X402_SETUP.md) for complete x402 configuration guide.**

### Endpoints

#### `GET /api/opportunities`

Get all current arbitrage opportunities.

**Query Parameters:**
- `sport` - Filter by sport (soccer, basketball, tennis, nfl, mlb)
- `min_profit` - Minimum profit % (e.g., 1.5)
- `stake` - Calculate exact amounts for this total stake

**Example Request:**
```bash
curl -H "X-API-Key: demo_key_12345" \
  "https://your-app.railway.app/api/opportunities?sport=soccer&min_profit=2&stake=100"
```

**Example Response:**
```json
{
  "success": true,
  "count": 3,
  "opportunities": [
    {
      "id": 1,
      "match": {
        "id": "match_123",
        "name": "Manchester United vs Liverpool",
        "sport": "soccer",
        "team1": "Manchester United",
        "team2": "Liverpool"
      },
      "profit_percentage": 2.3,
      "bets": [
        {
          "outcome": "Manchester United",
          "bookmaker": "Bet365",
          "odds": 2.10,
          "stake_percentage": 47.6,
          "stake_amount": 47.60,
          "potential_return": 100.00
        },
        {
          "outcome": "Draw",
          "bookmaker": "DraftKings",
          "odds": 8.50,
          "stake_percentage": 11.8,
          "stake_amount": 11.80,
          "potential_return": 100.30
        },
        {
          "outcome": "Liverpool",
          "bookmaker": "FanDuel",
          "odds": 16.00,
          "stake_percentage": 6.25,
          "stake_amount": 6.25,
          "potential_return": 100.00
        }
      ],
      "total_stake": 100,
      "guaranteed_profit": 2.30,
      "detected_at": "2025-12-26T10:30:00Z"
    }
  ]
}
```

#### `GET /api/opportunities/:id`

Get specific arbitrage opportunity.

**Example:**
```bash
curl -H "X-API-Key: demo_key_12345" \
  https://your-app.railway.app/api/opportunities/1?stake=100
```

#### `GET /api/opportunities/sports/list`

Get list of supported sports (no auth required).

## 💾 Database Management

### Auto-Cleanup

The system automatically deletes:
- Odds older than 3 hours (matches are over)
- Arbitrage opportunities older than 24 hours

This keeps your database size under 5 MB (well within Railway's 1 GB free tier).

### Manual Cleanup

```bash
node -e "require('./backend/database/queries').cleanupOldData()"
```

### View Database Stats

```bash
# Connect to Railway PostgreSQL
# In Railway dashboard: Database → Connect → PSQL command

# Check table sizes
SELECT 
  schemaname as schema,
  tablename as table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔧 Customization

### Adding More Sports

Edit `backend/scrapers/oddschecker.js`:

```javascript
const SPORTS_CONFIG = [
  // ... existing sports
  { 
    name: 'cricket', 
    url: 'https://www.oddschecker.com/cricket',
    has_draw: false
  }
];
```

### Change Scraping Frequency

Edit `backend/scrapers/scheduler.js`:

```javascript
// Every 5 minutes (default)
cron.schedule('*/5 * * * *', runScrapingJob);

// Every 1 minute (faster, more Apify costs)
cron.schedule('*/1 * * * *', runScrapingJob);

// Every 10 minutes (slower, cheaper)
cron.schedule('*/10 * * * *', runScrapingJob);
```

### Switch from Mock to Real Scraper

1. Install Puppeteer:
```bash
npm install puppeteer
```

2. Replace mock scraper in `backend/scrapers/oddschecker.js` with real scraping code (commented in the file)

3. Or use Apify's web scraper actor

## 🎯 Next Steps (After MVP)

### Week 2: Real Scraper
- [ ] Build Puppeteer scraper for Oddschecker
- [ ] OR use Apify's sportsbook scraper
- [ ] Add proxy rotation to avoid blocks

### Week 3: Enhanced Features
- [ ] WebSocket support for real-time updates
- [ ] Email/SMS alerts
- [ ] Telegram bot integration

### Month 2: Premium Features
- [ ] Live betting arbitrage
- [ ] More sports (Cricket, Golf, etc.)
- [ ] Historical data analytics
- [ ] Mobile app

## 📊 Cost Breakdown

### Free Tier (Testing)
```
Railway: $5 credit/month
  - API hosting: $0
  - PostgreSQL: $0
  - Total: $0

Apify: Free tier
  - Mock data: $0
  - Total: $0

TOTAL: $0/month
```

### Production (With Paying Customers)
```
Railway: $20/month
  - Better performance
  - No sleep mode
  
Apify: $30/month (if using their scrapers)
  OR
Build your own scraper: $0
  
TOTAL: $20-50/month
```

## 🐛 Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` in Railway environment variables
- Ensure PostgreSQL service is running

### "No arbitrage opportunities found"
- This is normal! Arbitrage is rare (2-5% of matches)
- Wait for scraper to run (every 5 minutes)
- Check database has odds: `SELECT COUNT(*) FROM odds;`

### "API key invalid"
- Use demo key: `demo_key_12345`
- Or create new key in database

### "Scheduler not running"
- Check `ENABLE_SCHEDULER=true` in env vars
- Check Railway logs for errors

## 📝 License

MIT

## 🤝 Contributing

PRs welcome! Please read contributing guidelines first.

## 📧 Support

- GitHub Issues: [Report bugs](https://github.com/yourusername/arbitrage-edge/issues)
- Email: support@arbitrageedge.com

---

**Built with ❤️ for the arbitrage community**
