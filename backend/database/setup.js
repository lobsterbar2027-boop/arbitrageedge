const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    
    await pool.query(schema);
    
    console.log('✅ Database setup complete!');
    console.log('✅ Demo API key created: demo_key_12345');
    
    // Don't exit - let the server start
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    // Don't exit on error either - tables might already exist
    await pool.end();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  setupDatabase().then(() => process.exit(0));
} else {
  // When required by another script, just run and return
  module.exports = setupDatabase();
}
