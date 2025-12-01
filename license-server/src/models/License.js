const pool = require("../config/database");

class LicenseModel {
  /**
   * Create a new license
   */
  static async create(data) {
    const {
      license_key,
      user_email,
      user_name,
      tier,
      max_activations,
      expires_at,
      stripe_customer_id,
      stripe_subscription_id,
    } = data;

    const query = `
      INSERT INTO licenses 
      (license_key, user_email, user_name, tier, max_activations, expires_at, stripe_customer_id, stripe_subscription_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `;

    const values = [
      license_key,
      user_email,
      user_name,
      tier,
      max_activations || 1,
      expires_at,
      stripe_customer_id,
      stripe_subscription_id,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find license by key
   */
  static async findByKey(license_key) {
    const query = "SELECT * FROM licenses WHERE license_key = $1";
    const result = await pool.query(query, [license_key]);
    return result.rows[0];
  }

  /**
   * Find license by email
   */
  static async findByEmail(email) {
    const query =
      "SELECT * FROM licenses WHERE user_email = $1 ORDER BY created_at DESC";
    const result = await pool.query(query, [email]);
    return result.rows;
  }

  /**
   * Update license
   */
  static async update(license_key, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(data).forEach((key) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(data[key]);
      paramCount++;
    });

    values.push(license_key);

    const query = `
      UPDATE licenses 
      SET ${fields.join(", ")}
      WHERE license_key = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get license with activations
   */
  static async getWithActivations(license_key) {
    const query = `
      SELECT 
        l.*,
        json_agg(
          json_build_object(
            'domain', a.domain,
            'site_name', a.site_name,
            'activated_at', a.activated_at,
            'last_seen', a.last_seen
          )
        ) FILTER (WHERE a.id IS NOT NULL) as activations
      FROM licenses l
      LEFT JOIN activations a ON l.id = a.license_id
      WHERE l.license_key = $1
      GROUP BY l.id
    `;

    const result = await pool.query(query, [license_key]);
    return result.rows[0];
  }

  /**
   * Get license usage for current month
   */
  static async getUsage(license_id) {
    const query = `
      SELECT * FROM usage_logs 
      WHERE license_id = $1 
      AND month = DATE_TRUNC('month', CURRENT_DATE)
    `;

    const result = await pool.query(query, [license_id]);
    return (
      result.rows[0] || {
        api_calls: 0,
        images_compressed: 0,
        bandwidth_saved: 0,
      }
    );
  }

  /**
   * Check expired licenses and update status
   */
  static async updateExpiredLicenses() {
    const query = `
      UPDATE licenses 
      SET status = 'expired' 
      WHERE expires_at < NOW() 
      AND status = 'active'
      RETURNING *
    `;

    const result = await pool.query(query);
    return result.rows;
  }
  /**
   * Get all licenses (for admin)
   */
  static async getAll() {
    const query = `
      SELECT l.*,
        (SELECT COUNT(*) FROM activations a WHERE a.license_id = l.id) as activation_count
      FROM licenses l
      ORDER BY l.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get licenses by user ID
   */
  static async getByUserId(userId) {
    const query = `
      SELECT l.*,
        (SELECT COUNT(*) FROM activations a WHERE a.license_id = l.id) as activation_count
      FROM licenses l
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Update license status
   */
  static async updateStatus(license_key, status) {
    const query = `
      UPDATE licenses
      SET status = $1
      WHERE license_key = $2
      RETURNING *
    `;
    const result = await pool.query(query, [status, license_key]);
    return result.rows[0];
  }
}

module.exports = LicenseModel;
