const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const pool = require("../config/database");

// Get payment gateway settings
router.get("/payment-gateway", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT gateway, settings FROM payment_settings WHERE id = 1"
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        success: true,
        data: {
          gateway: row.gateway,
          settings: JSON.parse(row.settings),
        },
      });
    } else {
      res.json({
        success: true,
        data: null,
      });
    }
  } catch (error) {
    console.error("Get payment settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve payment settings",
    });
  }
});

// Save payment gateway settings
router.post(
  "/payment-gateway",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { gateway, settings } = req.body;

      if (!gateway || !settings) {
        return res.status(400).json({
          success: false,
          message: "Gateway and settings are required",
        });
      }

      // Validate gateway type
      const validGateways = ["stripe", "paystack", "paypal"];
      if (!validGateways.includes(gateway)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment gateway",
        });
      }

      // Create table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_settings (
          id INTEGER PRIMARY KEY,
          gateway TEXT NOT NULL,
          settings JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert or update settings using UPSERT
      await pool.query(
        `
        INSERT INTO payment_settings (id, gateway, settings)
        VALUES (1, $1, $2)
        ON CONFLICT(id) DO UPDATE SET
          gateway = EXCLUDED.gateway,
          settings = EXCLUDED.settings,
          updated_at = CURRENT_TIMESTAMP
        `,
        [gateway, JSON.stringify(settings)]
      );

      res.json({
        success: true,
        message: "Payment settings saved successfully",
      });
    } catch (error) {
      console.error("Save payment settings error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save payment settings",
      });
    }
  }
);

// Get all pricing tiers
router.get("/pricing-tiers", authenticateToken, async (req, res) => {
  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        features TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(
      "SELECT * FROM pricing_tiers ORDER BY price ASC"
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get pricing tiers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve pricing tiers",
    });
  }
});

// Create pricing tier
router.post("/pricing-tiers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, price, description, features } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        features TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await pool.query(
      `
      INSERT INTO pricing_tiers (name, price, description, features)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [name, price, description || null, features || null]
    );

    res.json({
      success: true,
      message: "Pricing tier created successfully",
      data: { id: result.rows[0].id },
    });
  } catch (error) {
    console.error("Create pricing tier error:", error);
    if (error.code === "23505") {
      // PostgreSQL unique constraint violation
      res.status(400).json({
        success: false,
        message: "A tier with this name already exists",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to create pricing tier",
      });
    }
  }
});

// Update pricing tier
router.put(
  "/pricing-tiers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, description, features } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({
          success: false,
          message: "Name and price are required",
        });
      }

      const result = await pool.query(
        `
        UPDATE pricing_tiers
        SET name = $1, price = $2, description = $3, features = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id
        `,
        [name, price, description || null, features || null, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Pricing tier not found",
        });
      }

      res.json({
        success: true,
        message: "Pricing tier updated successfully",
      });
    } catch (error) {
      console.error("Update pricing tier error:", error);
      if (error.code === "23505") {
        // PostgreSQL unique constraint violation
        res.status(400).json({
          success: false,
          message: "A tier with this name already exists",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update pricing tier",
        });
      }
    }
  }
);

// Delete pricing tier
router.delete(
  "/pricing-tiers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        "DELETE FROM pricing_tiers WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Pricing tier not found",
        });
      }

      res.json({
        success: true,
        message: "Pricing tier deleted successfully",
      });
    } catch (error) {
      console.error("Delete pricing tier error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete pricing tier",
      });
    }
  }
);

module.exports = router;
