require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  const dbName = process.env.DB_NAME;
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbUsername = process.env.DB_USERNAME || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';

  // Connect to PostgreSQL server (not to a specific database)
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUsername,
    password: dbPassword,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully`);
    } else {
      console.log(`✅ Database "${dbName}" already exists`);
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    await client.end();
    process.exit(1);
  }
}

createDatabase();
