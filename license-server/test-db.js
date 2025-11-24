const { Pool } = require("pg");
require("dotenv").config();

async function testConnection(config) {
  console.log(`Testing connection to ${config.host} as ${config.user}...`);
  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log("✅ Connected successfully");
    client.release();
    await pool.end();
    return true;
  } catch (err) {
    console.error("❌ Connection failed:", err);
    await pool.end();
    return false;
  }
}

async function run() {
  // Test 1: Config from .env
  const config1 = {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  };

  if (!(await testConnection(config1))) {
    console.log("\nRetrying with 127.0.0.1...");
    config1.host = "127.0.0.1";
    if (!(await testConnection(config1))) {
      console.log('\nRetrying with user "postgres"...');
      config1.user = "postgres";
      await testConnection(config1);
    }
  }
}

run();
