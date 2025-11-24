const pool = require("../config/database");

class UsageModel {
  /**
   * Track API usage
   */
  static async track(license_id, data) {
    const { api_calls = 0, images_compressed = 0, bandwidth_saved = 0 } = data;
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01

    const query = `
      INSERT INTO usage_logs 
      (license_id, month, api_calls, images_compressed, bandwidth_saved, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (license_id, month) 
      DO UPDATE SET 
        api_calls = usage_logs.api_calls + EXCLUDED.api_calls,
        images_compressed = usage_logs.images_compressed + EXCLUDED.images_compressed,
        bandwidth_saved = usage_logs.bandwidth_saved + EXCLUDED.bandwidth_saved,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      license_id,
      currentMonth,
      api_calls,
      images_compressed,
      bandwidth_saved,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get current month usage
   */
  static async getCurrentMonth(license_id) {
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    const query = `
      SELECT * FROM usage_logs 
      WHERE license_id = $1 AND month = $2
    `;

    const result = await pool.query(query, [license_id, currentMonth]);
    return (
      result.rows[0] || {
        api_calls: 0,
        images_compressed: 0,
        bandwidth_saved: 0,
      }
    );
  }

  /**
   * Get usage history
   */
  static async getHistory(license_id, months = 12) {
    const query = `
      SELECT * FROM usage_logs 
      WHERE license_id = $1 
      ORDER BY month DESC 
      LIMIT $2
    `;

    const result = await pool.query(query, [license_id, months]);
    return result.rows;
  }

  /**
   * Get total usage across all time
   */
  static async getTotal(license_id) {
    const query = `
      SELECT 
        SUM(api_calls) as total_api_calls,
        SUM(images_compressed) as total_images,
        SUM(bandwidth_saved) as total_bandwidth
      FROM usage_logs 
      WHERE license_id = $1
    `;

    const result = await pool.query(query, [license_id]);
    return result.rows[0];
  }
}

module.exports = UsageModel;
