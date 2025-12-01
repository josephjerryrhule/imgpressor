const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

const licenseRoutes = require("./routes/license");
const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (relaxed for local dev)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS policy violation"), false);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Serve static files (Admin UI)
app.use(express.static(path.join(__dirname, "../public")));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/license", licenseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

// API root endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "WP ImgPressor License Server",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      admin: "/",
      license: {
        activate: "POST /api/license/activate",
        validate: "POST /api/license/validate",
        deactivate: "POST /api/license/deactivate",
        usage: "POST /api/license/usage",
        status: "GET /api/license/status/:license_key",
      },
    },
  });
});

// Root endpoint - redirect to admin UI
app.get("/", (req, res) => {
  res.redirect("/index.html");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 WP ImgPressor License Server                    ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || "development"}${" ".repeat(
    38 - (process.env.NODE_ENV || "development").length
  )}║
║   Port: ${PORT}${" ".repeat(46 - PORT.toString().length)}║
║   URL: http://localhost:${PORT}${" ".repeat(30 - PORT.toString().length)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  process.exit(0);
});

module.exports = app;
