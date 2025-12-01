const pool = require("../config/database");
const bcrypt = require("bcrypt");

class User {
  static async create({ email, password, full_name, phone, role = "user" }) {
    const passwordHash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role, created_at
    `;

    const values = [email, passwordHash, full_name, phone, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query =
      "SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateProfile(id, { full_name, phone, password }) {
    let query, values;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET full_name = $1, phone = $2, password_hash = $3
        WHERE id = $4
        RETURNING id, email, full_name, phone, role
      `;
      values = [full_name, phone, passwordHash, id];
    } else {
      query = `
        UPDATE users 
        SET full_name = $1, phone = $2
        WHERE id = $3
        RETURNING id, email, full_name, phone, role
      `;
      values = [full_name, phone, id];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll() {
    const query = `
      SELECT id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async validatePassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
