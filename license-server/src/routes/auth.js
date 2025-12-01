const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rateLimiter");

router.post("/register", rateLimiter, AuthController.register);
router.post("/login", rateLimiter, AuthController.login);
router.get("/me", authenticateToken, AuthController.me);
router.put("/profile", authenticateToken, AuthController.updateProfile);
router.get("/users", authenticateToken, requireAdmin, AuthController.listUsers);

module.exports = router;
