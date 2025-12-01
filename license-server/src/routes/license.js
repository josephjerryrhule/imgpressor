const express = require("express");
const router = express.Router();
const LicenseController = require("../controllers/LicenseController");
const { rateLimiter } = require("../middleware/rateLimiter");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Apply rate limiting to all license routes
router.use(rateLimiter);

// License endpoints
router.post("/activate", rateLimiter, LicenseController.activate);
router.post("/validate", rateLimiter, LicenseController.validate);
router.post("/deactivate", rateLimiter, LicenseController.deactivate);
router.post("/usage", rateLimiter, LicenseController.trackUsage);
router.post(
  "/create",
  authenticateToken,
  LicenseController.create
);
router.put(
  "/update-status",
  authenticateToken,
  requireAdmin,
  LicenseController.updateStatus
);
router.get("/list", authenticateToken, LicenseController.list);
router.get("/status/:license_key", rateLimiter, LicenseController.getStatus);

module.exports = router;
