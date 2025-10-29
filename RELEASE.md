# 🚀 Release Instructions

This guide explains how to create and publish new releases of ImgPressor.

## 📦 Creating a Release

### 1. Prepare the Release Package

```bash
# Build and package the release locally
npm run release:prepare
```

This creates a complete deployment package named `imgpressor-deployment-v{version}.zip`

### 2. Create GitHub Release

#### Option A: Using GitHub CLI (gh)
```bash
# Install GitHub CLI if not already installed
# brew install gh (macOS) or see https://cli.github.com/

# Create and push a new tag
git tag v2.3.0  # Replace with your version
git push origin v2.3.0

# Create release with the package
gh release create v2.3.0 \
  --title "ImgPressor v2.3.0" \
  --notes-file RELEASE_NOTES.md \
  imgpressor-deployment-v2.3.0.zip
```

#### Option B: Using GitHub Web Interface
1. Go to https://github.com/josephjerryrhule/imgpressor/releases
2. Click "Create a new release"
3. Set tag version (e.g., `v2.3.0`)
4. Set release title (e.g., "ImgPressor v2.3.0")
5. Add release notes (see template below)
6. Upload the `imgpressor-deployment-v{version}.zip` file
7. Click "Publish release"

#### Option C: Push Tag (Automatic via GitHub Actions)
```bash
# Simply push a new tag and GitHub Actions will handle the rest
git tag v2.3.0
git push origin v2.3.0
```

The GitHub Actions workflow will automatically:
- Build the deployment package
- Create the release
- Upload the deployment archive
- Generate release notes

## 📝 Release Notes Template

```markdown
## 🚀 ImgPressor v2.3.0

### 📦 Complete Deployment Package

This release contains a complete, self-contained deployment package for traditional servers.

### 🎯 What's Included:
- ✅ Frontend files (HTML, CSS, assets)
- ✅ Backend server (Express.js)
- ✅ All dependencies pre-installed
- ✅ Configuration files
- ✅ PM2 ecosystem config

### 🆕 What's New:
- Feature updates
- Bug fixes
- Performance improvements

### 🚀 Quick Deploy:
```bash
# Download and extract
wget https://github.com/josephjerryrhule/imgpressor/releases/download/v2.3.0/imgpressor-deployment-v2.3.0.zip
unzip imgpressor-deployment-v2.3.0.zip -d imgpressor
cd imgpressor

# Start the application
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

### 🌐 Access:
Visit `http://your-server:3000` to start compressing images!

### 📋 Changelog:
- Added new feature X
- Fixed issue Y
- Improved performance Z
```

## 🔄 Version Management

### Update Version Number

Update version in `package.json`:
```json
{
  "version": "2.4.0"
}
```

### Pre-release Checklist

- [ ] Update version in `package.json`
- [ ] Test build process: `npm run build:traditional`
- [ ] Test deployment package: `npm run release:prepare`
- [ ] Update CHANGELOG.md
- [ ] Commit all changes
- [ ] Create and push tag

### Post-release Tasks

- [ ] Verify release is published on GitHub
- [ ] Test auto-deploy script with new release
- [ ] Update documentation if needed
- [ ] Announce release (if applicable)

## 🔧 Deployment Testing

After creating a release, test the auto-deployment:

```bash
# Test the install script (this will download the latest release)
curl -sSL https://raw.githubusercontent.com/josephjerryrhule/imgpressor/master/scripts/install.sh | bash

# Or test with specific version
./scripts/auto-deploy.sh --version
```

## 🚨 Hotfix Releases

For urgent fixes:

1. Create hotfix branch from master
2. Apply minimal fix
3. Update patch version (e.g., 2.3.0 → 2.3.1)
4. Create release immediately
5. Merge back to master

```bash
git checkout -b hotfix/v2.3.1
# Apply fixes
npm version patch  # Updates package.json version
git commit -am "Hotfix v2.3.1: Critical bug fix"
git tag v2.3.1
git push origin v2.3.1
```

---

**Note**: The GitHub Actions workflow in `.github/workflows/release.yml` automates most of this process when you push a tag.