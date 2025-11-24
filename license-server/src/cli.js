const License = require("./models/License");
const { generateLicenseKey, calculateExpiryDate } = require("./utils/license");

/**
 * CLI tool for managing licenses
 */

const args = process.argv.slice(2);
const command = args[0];

async function createLicense() {
  const email = args[1];
  const tier = args[2] || "starter";
  const months = parseInt(args[3]) || 1;

  if (!email) {
    console.error("❌ Email is required");
    console.log("Usage: node cli.js create <email> [tier] [months]");
    process.exit(1);
  }

  const licenseKey = generateLicenseKey();
  const expiryDate = calculateExpiryDate(tier, months);

  const tierLimits = {
    free: 1,
    starter: 1,
    pro: 3,
    agency: 10,
  };

  const license = await License.create({
    license_key: licenseKey,
    user_email: email,
    tier: tier,
    max_activations: tierLimits[tier] || 1,
    expires_at: expiryDate,
  });

  console.log("\n✅ License created successfully!\n");
  console.log("License Key:", licenseKey);
  console.log("Email:", email);
  console.log("Tier:", tier);
  console.log(
    "Expires:",
    expiryDate ? expiryDate.toISOString().split("T")[0] : "Never"
  );
  console.log("Max Activations:", tierLimits[tier] || 1);
  console.log("\n");
}

async function listLicenses() {
  const email = args[1];

  if (!email) {
    console.error("❌ Email is required");
    console.log("Usage: node cli.js list <email>");
    process.exit(1);
  }

  const licenses = await License.findByEmail(email);

  if (licenses.length === 0) {
    console.log("No licenses found for", email);
    return;
  }

  console.log(`\nLicenses for ${email}:\n`);
  licenses.forEach((license, index) => {
    console.log(`${index + 1}. ${license.license_key}`);
    console.log(`   Tier: ${license.tier}`);
    console.log(`   Status: ${license.status}`);
    console.log(
      `   Expires: ${
        license.expires_at
          ? license.expires_at.toISOString().split("T")[0]
          : "Never"
      }`
    );
    console.log("");
  });
}

async function main() {
  try {
    switch (command) {
      case "create":
        await createLicense();
        break;
      case "list":
        await listLicenses();
        break;
      default:
        console.log("WP ImgPressor License Manager\n");
        console.log("Commands:");
        console.log("  create <email> [tier] [months]  - Create a new license");
        console.log(
          "  list <email>                    - List licenses for an email"
        );
        console.log("\nTiers: free, starter, pro, agency");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
