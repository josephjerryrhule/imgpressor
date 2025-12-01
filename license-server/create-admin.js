const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Adjust path if needed

const pool = new Pool({
  user: process.env.DATABASE_USER || "joeseph",
  host: process.env.DATABASE_HOST || "localhost",
  database: process.env.DATABASE_NAME || "imgpressor_license_server",
  password: process.env.DATABASE_PASSWORD || "",
  port: process.env.DATABASE_PORT || 5432,
});

async function createAdmin() {
  try {
    const email = "admin@imgpressor.com";
    const password = "adminpassword";
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email) DO UPDATE 
      SET role = 'admin', password_hash = $2
      RETURNING id, email, role;
    `;

    const res = await pool.query(query, [email, hashedPassword, "Admin User"]);
    console.log("Admin user created/updated:", res.rows[0]);
  } catch (err) {
    console.error("Error creating admin:", err);
  } finally {
    await pool.end();
  }
}

createAdmin();
