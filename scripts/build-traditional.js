#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Build script for complete traditional server deployment package
console.log('🏗️  Building complete deployment package for traditional server...');

const distDir = path.join(__dirname, '../dist');
const rootDir = path.join(__dirname, '..');

// Clean and create dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('🧹 Cleaned existing dist directory');
}

fs.mkdirSync(distDir, { recursive: true });

// Frontend files to copy
const frontendFiles = [
  'index.html',
  'styles.css',
  'favicon.svg',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest'
];

// Backend/Server files to copy
const serverFiles = [
  'app.js',
  'package.json',
  'package-lock.json',
  'ecosystem.config.js'
];

// Copy frontend files from public directory
console.log('📄 Copying frontend files...');
const publicDir = path.join(rootDir, 'public');
for (const file of frontendFiles) {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  Skipped ${file} (not found)`);
  }
}

// Copy server files from root directory
console.log('�️  Copying server files...');
for (const file of serverFiles) {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  Skipped ${file} (not found)`);
  }
}

// Optimize index.html for traditional server
console.log('🔧 Optimizing index.html for traditional server...');
const indexPath = path.join(distDir, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Ensure traditional server configuration
const configScript = `
<script>
  window.IMGPRESSOR_CONFIG = {
    API_URL: '',  // Use same origin
    ENVIRONMENT: 'production',
    USE_PAGES_FUNCTIONS: false  // Traditional server uses /process
  };
</script>`;

// Replace existing config script or insert before closing head tag
if (indexContent.includes('window.IMGPRESSOR_CONFIG')) {
  indexContent = indexContent.replace(
    /<script>[\s\S]*?window\.IMGPRESSOR_CONFIG[\s\S]*?<\/script>/,
    configScript
  );
} else {
  indexContent = indexContent.replace('</head>', configScript + '\n</head>');
}

// Ensure form action is correct for traditional server
indexContent = indexContent.replace(
  'action="/api/process"',
  'action="/process"'
);

// Add cache busting for production
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
indexContent = indexContent.replace(
  /\/styles\.css\?v=[\d\.]+/g,
  `/styles.css?v=${version}`
);

// Add build timestamp comment
const buildNote = `<!-- 
  Complete Traditional Server Deployment Package
  Version: ${version}
  Built: ${new Date().toISOString()}
  API Endpoint: /process
  Package Contents: Frontend + Backend + Dependencies
-->`;

indexContent = buildNote + '\n' + indexContent;
fs.writeFileSync(indexPath, indexContent);

// Update app.js to serve from current directory (since it's now in dist)
console.log('🔧 Updating app.js for deployment package...');
const appJsPath = path.join(distDir, 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Replace static directory logic since everything is in the same folder now
appJsContent = appJsContent.replace(
  /\/\/ Middleware\n\/\/ Determine static directory - use dist if it exists \(built\), otherwise public\nconst staticDir = fs\.existsSync\(path\.join\(__dirname, 'dist'\)\) \? 'dist' : 'public';\nconsole\.log\(`📁 Serving static files from: \${staticDir}\/`\);/,
  `// Middleware\n// Serve static files from current directory (deployment package)\nconsole.log('📁 Serving static files from current directory');`
);

fs.writeFileSync(appJsPath, appJsContent);

// Update package.json for deployment (remove build dependencies)
console.log('🔧 Updating package.json for deployment...');
const packageJsonPath = path.join(distDir, 'package.json');
const deployPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Remove build scripts that require source files (they're not needed in deployment)
if (deployPackageJson.scripts) {
  delete deployPackageJson.scripts.build;
  delete deployPackageJson.scripts['build:watch'];
  delete deployPackageJson.scripts['build:traditional'];
  delete deployPackageJson.scripts['build:pages'];
  delete deployPackageJson.scripts['build:static'];
  delete deployPackageJson.scripts['deploy:pages'];
  delete deployPackageJson.scripts['pages:dev'];
  delete deployPackageJson.scripts.postinstall; // Remove automatic build on install
}

// Remove dev dependencies from deployment package
delete deployPackageJson.devDependencies;

fs.writeFileSync(packageJsonPath, JSON.stringify(deployPackageJson, null, 2));

// Create a simple deployment README
const readmeContent = `# ImgPressor Deployment Package

This is a complete deployment package containing everything needed to run ImgPressor.

## Contents:
- Frontend files (index.html, styles.css, favicons, etc.)
- Backend server (app.js)
- Package configuration (package.json, ecosystem.config.js)

## Quick Deploy:
1. Extract this package to your server
2. Run: npm ci --only=production
3. Run: npm start (or pm2 start ecosystem.config.js)

## Version: ${version}
## Built: ${new Date().toISOString()}

## Endpoints:
- GET  / - Main page
- POST /process - Image processing
- GET  /health - Health check
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent);

console.log('✅ Complete deployment package created!');
console.log(`📦 Package location: ${distDir}`);
console.log('🚀 Ready for deployment');
console.log('');
console.log('📋 Package contents:');
console.log('  • Frontend files (HTML, CSS, assets)');
console.log('  • Backend server (app.js)');
console.log('  • Configuration files (package.json, ecosystem.config.js)');
console.log('  • Deployment README');
console.log('');
console.log('🔧 Deployment options:');
console.log('  1. Zip the dist/ folder');
console.log('  2. Upload and extract on server');
console.log('  3. Run: npm ci --only=production && npm start');
console.log('');