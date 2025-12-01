const pool = require("../config/database");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create licenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        license_key VARCHAR(19) UNIQUE NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        tier VARCHAR(20) NOT NULL DEFAULT 'free',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        max_activations INTEGER DEFAULT 1,
        metadata JSONB DEFAULT '{}'::jsonb
      );
      
      CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
      CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(user_email);
      CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
    `);

    // Create activations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activations (
        id SERIAL PRIMARY KEY,
        license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        site_name VARCHAR(255),
        wp_version VARCHAR(20),
        plugin_version VARCHAR(20),
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb,
        UNIQUE(license_id, domain)
      );
      
      CREATE INDEX IF NOT EXISTS idx_activations_license ON activations(license_id);
      CREATE INDEX IF NOT EXISTS idx_activations_domain ON activations(domain);
    `);

    // Create usage_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
        month DATE NOT NULL,
        api_calls INTEGER DEFAULT 0,
        images_compressed INTEGER DEFAULT 0,
        bandwidth_saved BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(license_id, month)
      );
      
      CREATE INDEX IF NOT EXISTS idx_usage_license ON usage_logs(license_id);
      CREATE INDEX IF NOT EXISTS idx_usage_month ON usage_logs(month);
    `);

    // Create api_keys table (for admin access)
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    `);

    // Create webhook_events table (for Stripe webhooks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        event_id VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        phone VARCHAR(255),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Add user_id to licenses if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'licenses' AND column_name = 'user_id') THEN
              ALTER TABLE licenses ADD COLUMN user_id INTEGER REFERENCES users(id);
              CREATE INDEX idx_licenses_user ON licenses(user_id);
          END IF;
      END $$;
    `);

    await client.query("COMMIT");
    console.log("✅ Database migration completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
