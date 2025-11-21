#!/usr/bin/env node

/**
 * WP ImgPressor Build Script
 * Creates production-ready WordPress plugin releases
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  section: (msg) =>
    console.log(
      `${colors.cyan}${"=".repeat(50)}\n${msg}\n${"=".repeat(50)}${
        colors.reset
      }`
    ),
};

// Configuration
const WP_DIR = path.join(__dirname, "..", "wp-imgpressor");
const BUILD_DIR = path.join(__dirname, "..", "wp-imgpressor-build");
const RELEASE_DIR = path.join(__dirname, "..", "releases", "wp-plugin");

// Files and directories to include in the build
const INCLUDE_FILES = [
  "wp-imgpressor.php",
  "uninstall.php",
  "index.php",
  "README.md",
  "INSTALL.md",
  "LICENSE",
  "includes",
  "assets",
];

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  ".git",
  ".gitignore",
  "node_modules",
  ".DS_Store",
  "Thumbs.db",
  "*.tmp",
  "*.cache",
  ".env",
  "install.sh",
  "package.json",
  "package-lock.json",
];

/**
 * Get current version from plugin file
 */
function getCurrentVersion() {
  const pluginFile = path.join(WP_DIR, "wp-imgpressor.php");
  const content = fs.readFileSync(pluginFile, "utf8");
  const versionMatch = content.match(/Version:\s*(\d+\.\d+\.\d+)/);

  if (!versionMatch) {
    throw new Error("Could not find version in wp-imgpressor.php");
  }

  return versionMatch[1];
}

/**
 * Bump version number
 */
function bumpVersion(currentVersion, type = "patch") {
  const parts = currentVersion.split(".").map(Number);

  switch (type) {
    case "major":
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case "minor":
      parts[1]++;
      parts[2] = 0;
      break;
    case "patch":
    default:
      parts[2]++;
      break;
  }

  return parts.join(".");
}

/**
 * Update version in plugin file
 */
function updatePluginVersion(newVersion) {
  const pluginFile = path.join(WP_DIR, "wp-imgpressor.php");
  let content = fs.readFileSync(pluginFile, "utf8");

  // Update version in header
  content = content.replace(
    /Version:\s*\d+\.\d+\.\d+/,
    `Version: ${newVersion}`
  );

  // Update version constant
  content = content.replace(
    /define\('WP_IMGPRESSOR_VERSION',\s*'[^']+'\);/,
    `define('WP_IMGPRESSOR_VERSION', '${newVersion}');`
  );

  fs.writeFileSync(pluginFile, content, "utf8");
  log.success(`Updated version to ${newVersion} in wp-imgpressor.php`);
}

/**
 * Update version in main class
 */
function updateClassVersion(newVersion) {
  const classFile = path.join(WP_DIR, "includes", "class-wp-imgpressor.php");
  let content = fs.readFileSync(classFile, "utf8");

  content = content.replace(
    /private \$version = '[^']+';/,
    `private $version = '${newVersion}';`
  );

  fs.writeFileSync(classFile, content, "utf8");
  log.success(`Updated version to ${newVersion} in class-wp-imgpressor.php`);
}

/**
 * Copy directory recursively with exclusions
 */
function copyDir(src, dest, excludePatterns = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check if should be excluded
    const shouldExclude = excludePatterns.some((pattern) => {
      if (pattern.startsWith("*")) {
        return entry.name.endsWith(pattern.substring(1));
      }
      return entry.name === pattern;
    });

    if (shouldExclude) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, excludePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create production readme
 */
function createProductionReadme(version) {
  const buildReadme = path.join(BUILD_DIR, "README.txt");

  const content = `=== WP ImgPressor ===
Contributors: josephjerryrhule
Tags: image, compression, webp, avif, optimization
Requires at least: 5.8
Tested up to: 6.4
Stable tag: ${version}
Requires PHP: 7.4
License: MIT
License URI: https://opensource.org/licenses/MIT

Automatically compress and convert uploaded images to WebP or AVIF format for optimal performance.

== Description ==

WP ImgPressor automatically compresses and converts your uploaded images to modern formats (WebP/AVIF) for better website performance and faster loading times.

= Features =

* Automatic compression on upload
* Convert to WebP or AVIF format
* Adjustable compression quality
* Maximum dimension controls
* Preserve original images (optional)
* Bulk compression for existing images
* Compression statistics dashboard
* Zero configuration needed

= Requirements =

* Node.js 16+ installed on server
* Sharp library (npm install -g sharp)
* PHP 7.4 or higher
* WordPress 5.8 or higher

== Installation ==

1. Upload the plugin files to '/wp-content/plugins/wp-imgpressor' directory
2. Install Node.js and Sharp: \`sudo npm install -g sharp\`
3. Activate the plugin through the 'Plugins' screen in WordPress
4. Configure settings at Settings → WP ImgPressor

For detailed installation instructions, see INSTALL.md

== Frequently Asked Questions ==

= Does this work on shared hosting? =

Most shared hosting doesn't support Node.js. You'll need VPS or dedicated server hosting.

= What formats are supported? =

Input: JPEG, PNG, GIF
Output: WebP, AVIF, JPEG, PNG

= Will this break my existing images? =

No, the plugin can preserve original images as backup. Enable "Preserve Original" in settings.

= Can I compress existing images? =

Yes! Use the bulk compression feature in Media → Library.

== Screenshots ==

1. Settings page with format selection
2. Compression quality slider
3. Compression statistics dashboard
4. Bulk compression in action

== Changelog ==

= ${version} =
* Production release
* Automatic compression on upload
* WebP and AVIF support
* Bulk compression feature
* Compression statistics
* Original image preservation

== Upgrade Notice ==

= ${version} =
Initial production release with full compression features.
`;

  fs.writeFileSync(buildReadme, content, "utf8");
  log.success("Created README.txt for WordPress.org");
}

/**
 * Create build info file
 */
function createBuildInfo(version) {
  const buildInfo = {
    version: version,
    build_date: new Date().toISOString(),
    build_type: "production",
    node_version: process.version,
    includes: INCLUDE_FILES,
  };

  fs.writeFileSync(
    path.join(BUILD_DIR, "build-info.json"),
    JSON.stringify(buildInfo, null, 2),
    "utf8"
  );
}

/**
 * Create ZIP archive
 */
function createZipArchive(version, buildType) {
  const zipName = `wp-imgpressor-${version}${
    buildType === "patch" ? "-patch" : ""
  }.zip`;
  const zipPath = path.join(RELEASE_DIR, zipName);

  // Ensure release directory exists
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  // Remove existing zip if present to prevent appending
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Create ZIP using Node.js to avoid platform issues
  try {
    const parentDir = path.dirname(BUILD_DIR);

    // Create zip by going into the build directory
    execSync(
      `cd "${BUILD_DIR}" && zip -r "${zipPath}" . -x "*.DS_Store" "*.git*"`,
      {
        stdio: "pipe",
      }
    );

    // Now we need to repackage it with the correct directory structure
    const tempExtract = path.join(parentDir, "temp-extract");
    const finalDir = path.join(tempExtract, "wp-imgpressor");

    // Clean and create temp directory
    if (fs.existsSync(tempExtract)) {
      fs.rmSync(tempExtract, { recursive: true, force: true });
    }
    fs.mkdirSync(finalDir, { recursive: true });

    // Extract the zip
    execSync(`unzip -q "${zipPath}" -d "${finalDir}"`, { stdio: "pipe" });

    // Remove the old zip
    fs.unlinkSync(zipPath);

    // Create new zip with correct structure
    execSync(
      `cd "${tempExtract}" && zip -r "${zipPath}" wp-imgpressor -x "*.DS_Store" "*.git*"`,
      {
        stdio: "pipe",
      }
    );

    // Clean up temp directory
    fs.rmSync(tempExtract, { recursive: true, force: true });

    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    log.success(`Created ${zipName} (${sizeMB} MB)`);
    return zipPath;
  } catch (error) {
    log.error(`Failed to create ZIP: ${error.message}`);
    throw error;
  }
}

/**
 * Clean build directory
 */
function cleanBuildDir() {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    log.info("Cleaned existing build directory");
  }
}

/**
 * Main build function
 */
function build(buildType = "release") {
  try {
    log.section("🏗️  WP ImgPressor Build Script");

    // Get current version
    const currentVersion = getCurrentVersion();
    log.info(`Current version: ${currentVersion}`);

    // Determine new version
    let newVersion = currentVersion;
    if (buildType !== "release") {
      newVersion = bumpVersion(currentVersion, buildType);
      log.info(`New version: ${newVersion} (${buildType})`);

      // Update version in files
      updatePluginVersion(newVersion);
      updateClassVersion(newVersion);
    }

    // Clean previous build
    log.info("Cleaning build directory...");
    cleanBuildDir();

    // Create build directory
    log.info("Creating build directory...");
    fs.mkdirSync(BUILD_DIR, { recursive: true });

    // Copy files
    log.info("Copying plugin files...");
    for (const file of INCLUDE_FILES) {
      const srcPath = path.join(WP_DIR, file);
      const destPath = path.join(BUILD_DIR, file);

      if (!fs.existsSync(srcPath)) {
        log.warning(`Skipping ${file} (not found)`);
        continue;
      }

      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath, EXCLUDE_PATTERNS);
        log.success(`Copied directory: ${file}`);
      } else {
        fs.copyFileSync(srcPath, destPath);
        log.success(`Copied file: ${file}`);
      }
    }

    // Create production readme
    log.info("Creating production README...");
    createProductionReadme(newVersion);

    // Create build info
    log.info("Creating build info...");
    createBuildInfo(newVersion);

    // Create ZIP archive
    log.info("Creating ZIP archive...");
    const zipPath = createZipArchive(newVersion, buildType);

    // Summary
    log.section("✅ Build Complete!");
    console.log(`
📦 Package Details:
   Version: ${newVersion}
   Type: ${
     buildType === "release"
       ? "Production Release"
       : buildType.charAt(0).toUpperCase() + buildType.slice(1) + " Release"
   }
   Build Dir: ${BUILD_DIR}
   ZIP File: ${zipPath}

🚀 Next Steps:
   1. Test the plugin: Unzip and install in WordPress
   2. Upload to WordPress.org (if approved)
   3. Create GitHub release with the ZIP file
   4. Update documentation

📋 Files Included:
${INCLUDE_FILES.map((f) => `   • ${f}`).join("\n")}
        `);

    // Keep build directory for inspection
    log.info(`Build directory preserved at: ${BUILD_DIR}`);
  } catch (error) {
    log.error(`Build failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const buildType = process.argv[2] || "major";

if (!["release", "patch", "minor", "major"].includes(buildType)) {
  log.error(`Invalid build type: ${buildType}`);
  log.info("Valid types: release, patch, minor, major");
  process.exit(1);
}

// Run build
build(buildType);
