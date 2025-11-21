#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Build script for Cloudflare Pages static deployment
console.log("🏗️  Building static assets for Cloudflare Pages...");

const distDir = path.join(__dirname, "../dist");
const publicDir = path.join(__dirname, "../public");

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy all public files to dist
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Skip optimized directory for Pages deployment
      if (entry.name === "optimized") {
        console.log(
          `⏭️  Skipping ${entry.name} directory (not needed for static deployment)`
        );
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 Copied ${entry.name}`);
    }
  }
}

// Copy public directory contents to dist
copyDirectory(publicDir, distDir);

// Update index.html for Cloudflare Pages deployment
const indexPath = path.join(distDir, "index.html");
let indexContent = fs.readFileSync(indexPath, "utf8");

// Replace the API configuration for Pages deployment
const configScript = `
<script>
  window.IMGPRESSOR_CONFIG = {
    API_URL: '',  // Use same origin for Pages
    ENVIRONMENT: 'production',
    USE_PAGES_FUNCTIONS: true  // Enable Pages Functions routing
  };
</script>`;

// Replace existing config script or insert before closing head tag
if (indexContent.includes("window.IMGPRESSOR_CONFIG")) {
  indexContent = indexContent.replace(
    /<script>[\s\S]*?window\.IMGPRESSOR_CONFIG[\s\S]*?<\/script>/,
    configScript
  );
} else {
  indexContent = indexContent.replace("</head>", configScript + "\n</head>");
}

// Update form action to use /api/process for Pages Functions
indexContent = indexContent.replace(
  'action="/process"',
  'action="/api/process"'
);

// Add note about Pages deployment
const deploymentNote = `
<!-- 
  This build is optimized for Cloudflare Pages deployment.
  API endpoints are handled by Cloudflare Pages Functions in /functions directory.
  For traditional server deployment, use 'npm start' instead.
-->`;

indexContent = deploymentNote + "\n" + indexContent;

fs.writeFileSync(indexPath, indexContent);

console.log("✅ Static build complete!");
console.log(`📦 Assets built to: ${distDir}`);
console.log("🚀 Ready for Cloudflare Pages deployment");

// Create _routes.json for Cloudflare Pages routing
const routesConfig = {
  version: 1,
  include: ["/*"],
  exclude: [],
};

fs.writeFileSync(
  path.join(distDir, "_routes.json"),
  JSON.stringify(routesConfig, null, 2)
);

console.log("📋 Created _routes.json for Pages Functions routing");

// Create a simple health check function
const healthFunction = `
export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'healthy',
    version: '2.3.0',
    platform: 'Cloudflare Pages',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
`;

if (!fs.existsSync(path.join(__dirname, "../functions/api"))) {
  fs.mkdirSync(path.join(__dirname, "../functions/api"), { recursive: true });
}

fs.writeFileSync(
  path.join(__dirname, "../functions/api/health.js"),
  healthFunction
);

console.log("🏥 Created health check function");
console.log("");
console.log("Next steps:");
console.log("  1. Deploy to Cloudflare Pages: npm run deploy:pages");
console.log("  2. Or test locally: npm run pages:dev");
console.log("");
