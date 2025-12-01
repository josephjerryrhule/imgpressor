const License = require("../models/License");
const Activation = require("../models/Activation");
const Usage = require("../models/Usage");
const {
  isValidLicenseKey,
  getTierLimits,
  normalizeDomain,
  isInGracePeriod,
} = require("../utils/license");

class LicenseController {
  /**
   * Activate a license
   * POST /api/license/activate
   */
  static async activate(req, res) {
    try {
      const { license_key, domain, site_name, wp_version, plugin_version } =
        req.body;

      // Validate input
      if (!license_key || !domain) {
        return res.status(400).json({
          success: false,
          message: "License key and domain are required",
        });
      }

      // Validate license key format
      if (!isValidLicenseKey(license_key)) {
        return res.status(400).json({
          success: false,
          message: "Invalid license key format",
        });
      }

      // Find license
      const license = await License.findByKey(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: "License key not found",
        });
      }

      // Check if license is active
      if (license.status === "suspended") {
        return res.status(403).json({
          success: false,
          message: "License has been suspended. Please contact support.",
        });
      }

      if (license.status === "cancelled") {
        return res.status(403).json({
          success: false,
          message: "License has been cancelled",
        });
      }

      // Check if expired (with grace period)
      if (
        license.status === "expired" ||
        (license.expires_at && new Date(license.expires_at) < new Date())
      ) {
        if (!isInGracePeriod(license.expires_at)) {
          return res.status(403).json({
            success: false,
            message: "License has expired. Please renew your subscription.",
          });
        }
      }

      // Normalize domain
      const normalizedDomain = normalizeDomain(domain);

      // Check if already activated on this domain
      const existingActivation = await Activation.isActivated(
        license.id,
        normalizedDomain
      );

      if (!existingActivation) {
        // Check activation limit
        const activationCount = await Activation.count(license.id);

        if (activationCount >= license.max_activations) {
          return res.status(403).json({
            success: false,
            message: `Maximum number of activations (${license.max_activations}) reached`,
          });
        }
      }

      // Create or updating activation
      await Activation.create(license.id, normalizedDomain, {
        site_name,
        wp_version,
        plugin_version,
      });

      // Get tier limits
      const limits = getTierLimits(license.tier);

      // Get current usage
      const usage = await Usage.getCurrentMonth(license.id);

      // Prepare response data
      const responseData = {
        tier: license.tier,
        status: license.status,
        expires_at: license.expires_at,
        activations: await Activation.count(license.id),
        max_activations: license.max_activations,
        quota: {
          monthly_limit: limits.monthly_limit,
          used: usage.api_calls || 0,
          reset_date: getQuotaResetDate(),
        },
        features: limits.features,
      };

      res.json({
        success: true,
        message: "License activated successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("Activation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Validate a license
   * POST /api/license/validate
   */
  static async validate(req, res) {
    try {
      const { license_key, domain } = req.body;

      if (!license_key || !domain) {
        return res.status(400).json({
          success: false,
          message: "License key and domain are required",
        });
      }

      const license = await License.findByKey(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          status: "invalid",
          message: "License key not found",
        });
      }

      const normalizedDomain = normalizeDomain(domain);

      // Check if activated on this domain
      const activation = await Activation.isActivated(
        license.id,
        normalizedDomain
      );

      if (!activation) {
        return res.status(403).json({
          success: false,
          status: "not_activated",
          message: "License not activated on this domain",
        });
      }

      // Update last seen
      await Activation.updateLastSeen(license.id, normalizedDomain);

      // Check status
      if (license.status === "suspended") {
        return res.json({
          success: false,
          status: "suspended",
          message: "License suspended",
        });
      }

      if (license.status === "cancelled") {
        return res.json({
          success: false,
          status: "cancelled",
          message: "License cancelled",
        });
      }

      // Check expiry
      if (license.expires_at && new Date(license.expires_at) < new Date()) {
        if (!isInGracePeriod(license.expires_at)) {
          await License.update(license_key, { status: "expired" });

          return res.json({
            success: false,
            status: "expired",
            message: "License expired",
          });
        }
      }

      // Get usage and limits
      const limits = getTierLimits(license.tier);
      const usage = await Usage.getCurrentMonth(license.id);

      res.json({
        success: true,
        status: "active",
        data: {
          tier: license.tier,
          expires_at: license.expires_at,
          quota: {
            monthly_limit: limits.monthly_limit,
            used: usage.api_calls || 0,
            reset_date: getQuotaResetDate(),
          },
          features: limits.features,
        },
      });
    } catch (error) {
      console.error("Validation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Deactivate a license
   * POST /api/license/deactivate
   */
  static async deactivate(req, res) {
    try {
      const { license_key, domain } = req.body;

      if (!license_key || !domain) {
        return res.status(400).json({
          success: false,
          message: "License key and domain are required",
        });
      }

      const license = await License.findByKey(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: "License key not found",
        });
      }

      const normalizedDomain = normalizeDomain(domain);
      const activation = await Activation.deactivate(
        license.id,
        normalizedDomain
      );

      if (!activation) {
        return res.status(404).json({
          success: false,
          message: "No activation found for this domain",
        });
      }

      res.json({
        success: true,
        message: "License deactivated successfully",
      });
    } catch (error) {
      console.error("Deactivation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Track usage
   * POST /api/license/usage
   */
  static async trackUsage(req, res) {
    try {
      const { license_key, domain, count = 1 } = req.body;

      if (!license_key || !domain) {
        return res.status(400).json({
          success: false,
          message: "License key and domain are required",
        });
      }

      const license = await License.findByKey(license_key);

      if (!license || license.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Invalid or inactive license",
        });
      }

      const normalizedDomain = normalizeDomain(domain);
      const activation = await Activation.isActivated(
        license.id,
        normalizedDomain
      );

      if (!activation) {
        return res.status(403).json({
          success: false,
          message: "License not activated on this domain",
        });
      }

      // Track usage
      await Usage.track(license.id, { api_calls: count });

      // Get updated usage
      const usage = await Usage.getCurrentMonth(license.id);
      const limits = getTierLimits(license.tier);

      // Check if quota exceeded
      if (limits.monthly_limit > 0 && usage.api_calls > limits.monthly_limit) {
        return res.status(429).json({
          success: false,
          message: "Monthly API quota exceeded",
          quota: {
            monthly_limit: limits.monthly_limit,
            used: usage.api_calls,
            reset_date: getQuotaResetDate(),
          },
        });
      }

      res.json({
        success: true,
        quota: {
          monthly_limit: limits.monthly_limit,
          used: usage.api_calls,
          reset_date: getQuotaResetDate(),
        },
      });
    } catch (error) {
      console.error("Usage tracking error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get license status
   * GET /api/license/status/:license_key
   */
  static async getStatus(req, res) {
    try {
      const { license_key } = req.params;

      const licenseData = await License.getWithActivations(license_key);

      if (!licenseData) {
        return res.status(404).json({
          success: false,
          message: "License not found",
        });
      }

      const usage = await Usage.getCurrentMonth(licenseData.id);
      const limits = getTierLimits(licenseData.tier);

      res.json({
        success: true,
        data: {
          tier: licenseData.tier,
          status: licenseData.status,
          expires_at: licenseData.expires_at,
          activations: licenseData.activations || [],
          max_activations: licenseData.max_activations,
          quota: {
            monthly_limit: limits.monthly_limit,
            used: usage.api_calls || 0,
            reset_date: getQuotaResetDate(),
          },
        },
      });
    } catch (error) {
      console.error("Status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  /**
   * List all licenses
   * GET /api/license/list
   */
  static async list(req, res) {
    try {
      const License = require("../models/License");
      let licenses;

      // If admin, show all. If user, show only theirs.
      if (req.user && req.user.role === "admin") {
        licenses = await License.getAll();
      } else if (req.user) {
        // We need to implement getByUserId in License model
        licenses = await License.getByUserId(req.user.id);
      } else {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      res.json({
        success: true,
        data: licenses,
      });
    } catch (error) {
      console.error("List error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create a new license
   * POST /api/license/create
   */
  static async create(req, res) {
    try {
      const { email, tier = "starter", duration = 12 } = req.body;

      // Determine email and user_id based on who's creating the license
      let userEmail = email;
      let userId = null;

      if (req.user) {
        // If email is provided and matches the current user's email, use their user_id
        if (email === req.user.email) {
          userEmail = req.user.email;
          userId = req.user.id;
        } else if (req.user.role !== "admin") {
          // Non-admin users can only create licenses for themselves
          userEmail = req.user.email;
          userId = req.user.id;
        } else {
          // Admin creating for someone else
          if (email) {
            const User = require("../models/User");
            const user = await User.findByEmail(email);
            if (user) {
              userId = user.id;
              userEmail = email;
            } else {
              // Email provided but user doesn't exist - still create license with email
              userEmail = email;
            }
          } else {
            // No email provided, use admin's own email
            userEmail = req.user.email;
            userId = req.user.id;
          }
        }
      }

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const License = require("../models/License");
      const {
        generateLicenseKey,
        calculateExpiryDate,
        getTierLimits,
      } = require("../utils/license");

      const licenseKey = generateLicenseKey();
      const expiryDate = calculateExpiryDate(tier, parseInt(duration));
      const limits = getTierLimits(tier);

      const license = await License.create({
        license_key: licenseKey,
        user_email: userEmail,
        tier: tier,
        max_activations: limits.max_activations || 1,
        expires_at: expiryDate,
        user_id: userId,
      });

      res.json({
        success: true,
        data: license,
      });
    } catch (error) {
      console.error("Create error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update license status
   * PUT /api/license/update-status
   */
  static async updateStatus(req, res) {
    try {
      const { license_key, status } = req.body;

      // Validate input
      if (!license_key || !status) {
        return res.status(400).json({
          success: false,
          message: "License key and status are required",
        });
      }

      // Validate status
      const validStatuses = [
        "active",
        "suspend",
        "suspended",
        "cancelled",
        "expired",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      // Find license
      const license = await License.findByKey(license_key);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: "License not found",
        });
      }

      // Update status
      await License.updateStatus(license_key, status);

      return res.status(200).json({
        success: true,
        message: `License ${
          status === "active" ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error) {
      console.error("Update license status error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update license status",
      });
    }
  }
}

/**
 * Get first day of next month
 */
function getQuotaResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split("T")[0];
}

module.exports = LicenseController;
