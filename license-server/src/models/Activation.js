const pool = require("../config/database");

class ActivationModel {
  /**
   * Create new activation
   */
  static async create(license_id, domain, siteData) {
    const { site_name, wp_version, plugin_version } = siteData;

    const query = `
      INSERT INTO activations 
      (license_id, domain, site_name, wp_version, plugin_version)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (license_id, domain) 
      DO UPDATE SET 
        last_seen = CURRENT_TIMESTAMP,
        wp_version = EXCLUDED.wp_version,
        plugin_version = EXCLUDED.plugin_version
      RETURNING *
    `;

    const values = [license_id, domain, site_name, wp_version, plugin_version];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all activations for a license
   */
  static async findByLicense(license_id) {
    const query =
      "SELECT * FROM activations WHERE license_id = $1 ORDER BY activated_at DESC";
    const result = await pool.query(query, [license_id]);
    return result.rows;
  }

  /**
   * Check if domain is activated
   */
  static async isActivated(license_id, domain) {
    const query =
      "SELECT * FROM activations WHERE license_id = $1 AND domain = $2";
    const result = await pool.query(query, [license_id, domain]);
    return result.rows[0];
  }

  /**
   * Count activations
   */
  static async count(license_id) {
    const query =
      "SELECT COUNT(*) as count FROM activations WHERE license_id = $1";
    const result = await pool.query(query, [license_id]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Deactivate (remove activation)
   */
  static async deactivate(license_id, domain) {
    const query =
      "DELETE FROM activations WHERE license_id = $1 AND domain = $2 RETURNING *";
    const result = await pool.query(query, [license_id, domain]);
    return result.rows[0];
  }

  /**
   * Update last seen
   */
  static async updateLastSeen(license_id, domain) {
    const query = `
      UPDATE activations 
      SET last_seen = CURRENT_TIMESTAMP 
      WHERE license_id = $1 AND domain = $2
      RETURNING *
    `;

    const result = await pool.query(query, [license_id, domain]);
    return result.rows[0];
  }
}

module.exports = ActivationModel;
