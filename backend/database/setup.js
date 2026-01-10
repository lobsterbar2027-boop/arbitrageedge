const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  // Skip setup if DATABASE_URL is not available
  if (!process.env.DATABASE_URL) {
    console.log('⏭️  Skipping database setup (DATABASE_URL not set)');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Setting up database...');
    
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    
    await pool.query(schema);
    
    console.log('✅ Database setup complete!');
    console.log('✅ Demo API key created: demo_key_12345');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    // Don't throw - let server start anyway
  } finally {
    await pool.end();
  }
}

// Run setup and continue
setupDatabase().catch(err => {
  console.error('Setup error:', err.message);
});

// Export for use in other scripts
module.exports = setupDatabase;
