# WordPress Plugin Build System

## 📦 Build Commands

The ImgPressor project now includes a complete build system for creating production-ready WordPress plugin releases.

### Available Commands

```bash
# Build production release (current version)
npm run build:wp

# Build with version bump - Patch (1.0.0 → 1.0.1)
npm run build:wp:patch

# Build with version bump - Minor (1.0.1 → 1.1.0)
npm run build:wp:minor

# Build with version bump - Major (1.1.0 → 2.0.0)
npm run build:wp:major
```

## 🎯 What the Build Does

1. **Version Management**:
   - Reads current version from `wp-imgpressor.php`
   - Optionally bumps version (patch/minor/major)
   - Updates version in all relevant files

2. **File Packaging**:
   - Copies all necessary plugin files
   - Excludes development files (node_modules, .git, etc.)
   - Creates proper WordPress plugin structure

3. **Documentation**:
   - Generates WordPress.org compatible README.txt
   - Includes build information file
   - Preserves all markdown documentation

4. **ZIP Creation**:
   - Creates production-ready ZIP file
   - Proper directory structure for WordPress
   - Optimized for WordPress.org submission

## 📁 Output Structure

```
releases/
└── wp-plugin/
    └── wp-imgpressor-1.0.0.zip
        └── wp-imgpressor/
            ├── wp-imgpressor.php      # Main plugin file
            ├── uninstall.php           # Uninstall handler
            ├── README.md               # GitHub readme
            ├── README.txt              # WordPress.org readme
            ├── INSTALL.md              # Installation guide
            ├── LICENSE                 # MIT License
            ├── build-info.json         # Build metadata
            ├── includes/               # Core classes
            │   ├── class-wp-imgpressor.php
            │   ├── class-wp-imgpressor-admin.php
            │   └── class-wp-imgpressor-compressor.php
            └── assets/                 # Frontend assets
                ├── css/
                │   └── admin.css
                └── js/
                    └── admin.js
```

## 🔄 Version Bumping

### Patch Release (Bug Fixes)
```bash
npm run build:wp:patch
# 1.0.0 → 1.0.1
```

Use for:
- Bug fixes
- Minor tweaks
- Documentation updates

### Minor Release (New Features)
```bash
npm run build:wp:minor
# 1.0.1 → 1.1.0
```

Use for:
- New features
- Enhancements
- Non-breaking changes

### Major Release (Breaking Changes)
```bash
npm run build:wp:major
# 1.1.0 → 2.0.0
```

Use for:
- Breaking changes
- Major rewrites
- Significant API changes

## 📋 Build Process Details

### 1. Pre-Build
- Validates source directory exists
- Reads current version
- Calculates new version (if bumping)

### 2. Version Update
Updates version in:
- `wp-imgpressor.php` (plugin header)
- `wp-imgpressor.php` (WP_IMGPRESSOR_VERSION constant)
- `includes/class-wp-imgpressor.php` (class property)

### 3. File Copying
Includes:
- ✅ All PHP files
- ✅ Assets (CSS, JS)
- ✅ Documentation (MD files)
- ✅ LICENSE file

Excludes:
- ❌ .git directory
- ❌ node_modules
- ❌ Development files (install.sh, package.json)
- ❌ Temporary files

### 4. Documentation Generation
Creates `README.txt` with:
- WordPress.org compatible format
- Plugin metadata
- Installation instructions
- FAQ section
- Changelog

### 5. ZIP Creation
- Creates releases directory
- Packages files with correct structure
- Names: `wp-imgpressor-{version}.zip`
- Patch builds include `-patch` suffix

### 6. Build Artifacts
Preserves build directory at:
```
wp-imgpressor-build/
```

For inspection and manual testing.

## 🚀 Release Workflow

### 1. Development
```bash
# Make your changes in wp-imgpressor/
cd wp-imgpressor
# Edit files, test locally
```

### 2. Build Release
```bash
# For bug fixes
npm run build:wp:patch

# For new features
npm run build:wp:minor

# For major changes
npm run build:wp:major
```

### 3. Test Build
```bash
# Extract and test in WordPress
cd wp-imgpressor-build
# Copy to WordPress plugins directory
# Test activation, settings, compression
```

### 4. Distribute
```bash
# The ZIP file is ready for:
# - WordPress.org submission
# - GitHub releases
# - Direct distribution
ls releases/wp-plugin/
```

## 🔍 Build Output Example

```bash
$ npm run build:wp:patch

> imgpressor@2.3.0 build:wp:patch
> node scripts/build-wp-plugin.js patch

==================================================
🏗️  WP ImgPressor Build Script
==================================================
ℹ️  Current version: 1.0.0
ℹ️  New version: 1.0.1 (patch)
✅ Updated version to 1.0.1 in wp-imgpressor.php
✅ Updated version to 1.0.1 in class-wp-imgpressor.php
ℹ️  Cleaning build directory...
ℹ️  Creating build directory...
ℹ️  Copying plugin files...
✅ Copied file: wp-imgpressor.php
✅ Copied file: uninstall.php
✅ Copied file: index.php
✅ Copied file: README.md
✅ Copied file: INSTALL.md
✅ Copied file: LICENSE
✅ Copied directory: includes
✅ Copied directory: assets
ℹ️  Creating production README...
✅ Created README.txt for WordPress.org
ℹ️  Creating build info...
ℹ️  Creating ZIP archive...
✅ Created wp-imgpressor-1.0.1-patch.zip (0.02 MB)

==================================================
✅ Build Complete!
==================================================

📦 Package Details:
   Version: 1.0.1
   Type: Patch Release
   Build Dir: /path/to/wp-imgpressor-build
   ZIP File: /path/to/releases/wp-plugin/wp-imgpressor-1.0.1-patch.zip

🚀 Next Steps:
   1. Test the plugin: Unzip and install in WordPress
   2. Upload to WordPress.org (if approved)
   3. Create GitHub release with the ZIP file
   4. Update documentation
```

## 🛠️ Troubleshooting

### Build Fails: "Cannot find wp-imgpressor directory"
**Solution**: Ensure the `wp-imgpressor` source directory exists.

### Version Not Updating
**Solution**: Check that version format in `wp-imgpressor.php` matches: `Version: X.Y.Z`

### ZIP File Too Large
**Solution**: Check for accidentally included node_modules or large files.

### Wrong Directory Structure in ZIP
**Solution**: The build script handles this automatically. Check temp-extract cleanup.

## 📝 Manual Build (Alternative)

If automated build fails, you can manually create a release:

```bash
# 1. Copy files
mkdir -p releases/wp-plugin/wp-imgpressor
cp -r wp-imgpressor/* releases/wp-plugin/wp-imgpressor/

# 2. Clean up
cd releases/wp-plugin/wp-imgpressor
rm -rf node_modules .git* install.sh package*.json

# 3. Create ZIP
cd ..
zip -r wp-imgpressor-1.0.0.zip wp-imgpressor/
```

## 🎯 Best Practices

1. **Always Test**: Test builds in a fresh WordPress installation
2. **Version Consistency**: Use semantic versioning (semver)
3. **Changelog**: Update README.txt changelog for each release
4. **Git Tagging**: Tag releases in git: `git tag v1.0.1`
5. **Documentation**: Keep INSTALL.md and README.md updated

## 📚 Related Files

- `scripts/build-wp-plugin.js` - Build script
- `package.json` - npm scripts configuration
- `wp-imgpressor/` - Source directory
- `releases/wp-plugin/` - Build output directory

---

**Note**: The WordPress plugin directory (`wp-imgpressor/`) must exist before running build commands. If it was deleted, you'll need to recreate it or restore from git.