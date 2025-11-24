const express = require("express");
const router = express.Router();
const LicenseController = require("../controllers/LicenseController");
const { rateLimiter } = require("../middleware/rateLimiter");

// Apply rate limiting to all license routes
router.use(rateLimiter);

// License endpoints
router.post("/activate", rateLimiter, LicenseController.activate);
router.post("/validate", rateLimiter, LicenseController.validate);
router.post("/deactivate", rateLimiter, LicenseController.deactivate);
router.post("/usage", rateLimiter, LicenseController.trackUsage);
router.post("/create", LicenseController.create); // Admin only
router.get("/list", LicenseController.list); // Admin only (add auth in prod)
router.get("/status/:license_key", rateLimiter, LicenseController.getStatus);

module.exports = router;
