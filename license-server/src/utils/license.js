const crypto = require("crypto");

/**
 * Generate a license key in format: XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing characters
  let key = "";

  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      key += "-";
    }
    const randomIndex = crypto.randomInt(0, chars.length);
    key += chars[randomIndex];
  }

  return key;
}

/**
 * Validate license key format
 */
function isValidLicenseKey(key) {
  const regex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return regex.test(key);
}

/**
 * Get quota limits for a tier
 */
function getTierLimits(tier) {
  const limits = {
    free: {
      monthly_limit: 0,
      max_activations: 1,
      features: ["local_compression", "basic_settings"],
    },
    starter: {
      monthly_limit: 1000,
      max_activations: 1,
      features: [
        "local_compression",
        "basic_settings",
        "api_compression",
        "analytics",
        "restore",
      ],
    },
    pro: {
      monthly_limit: 10000,
      max_activations: 3,
      features: [
        "local_compression",
        "basic_settings",
        "api_compression",
        "analytics",
        "restore",
        "scheduler",
        "presets",
        "cli",
      ],
    },
    agency: {
      monthly_limit: -1, // Unlimited
      max_activations: 10,
      features: [
        "local_compression",
        "basic_settings",
        "api_compression",
        "analytics",
        "restore",
        "scheduler",
        "presets",
        "cli",
        "white_label",
        "multisite",
      ],
    },
  };

  return limits[tier] || limits.free;
}

/**
 * Calculate expiry date for a tier
 */
function calculateExpiryDate(tier, months = 1) {
  if (tier === "free") {
    return null; // Free tier doesn't expire
  }

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return expiryDate;
}

/**
 * Check if license is in grace period
 */
function isInGracePeriod(expiresAt, graceDays = 7) {
  if (!expiresAt) return false;

  const expiry = new Date(expiresAt);
  const graceEnd = new Date(expiry);
  graceEnd.setDate(graceEnd.getDate() + graceDays);

  return new Date() <= graceEnd;
}

/**
 * Normalize domain
 */
function normalizeDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch (error) {
    // If not a valid URL, assume it's already a domain
    return url.replace(/^www\./, "").toLowerCase();
  }
}

/**
 * Generate API key hash
 */
function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

module.exports = {
  generateLicenseKey,
  isValidLicenseKey,
  getTierLimits,
  calculateExpiryDate,
  isInGracePeriod,
  normalizeDomain,
  hashApiKey,
};
