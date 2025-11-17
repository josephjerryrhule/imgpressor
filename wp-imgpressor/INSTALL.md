# WP ImgPressor - Installation Guide

Complete installation instructions for WP ImgPressor WordPress plugin.

## Prerequisites

Before installing WP ImgPressor, ensure your server meets these requirements:

### Required Software

1. **WordPress**: Version 5.0 or higher
2. **PHP**: Version 7.4 or higher
3. **GD Extension** (included in most PHP installations) OR **Imagick Extension** (available on most hosts)

### Server Requirements

- Write permissions on WordPress uploads directory
- Sufficient disk space for compressed images
- **No SSH access needed** - plugin works immediately after activation!

## Installation Methods

### Method 1: WordPress Admin Upload (Recommended)

1. **Prepare the plugin**
   - Download the latest release ZIP file
   - Or build from source: `npm run build:wp`

2. **Upload via WordPress admin**
   - Log in to WordPress admin
   - Go to **Plugins → Add New**
   - Click **Upload Plugin**
   - Choose `wp-imgpressor-X.X.X.zip`
   - Click **Install Now**
   - Click **Activate Plugin**

**That's it!** The plugin is ready to use.

### Method 2: Manual File Upload

1. **Upload plugin files**
   - Extract `wp-imgpressor-X.X.X.zip`
   - Upload the `wp-imgpressor` folder to `wp-content/plugins/` via FTP/SFTP

2. **Activate the plugin**
   - Go to **Plugins** in WordPress admin
   - Find **WP ImgPressor**
   - Click **Activate**

### Method 3: WP-CLI

```bash
wp plugin install wp-imgpressor-X.X.X.zip --activate
```

## Post-Installation Configuration

### 1. Verify Installation

After activating the plugin:

1. Go to **Settings → WP ImgPressor**
2. Check the notice at the top - it will show which image library is being used (GD or Imagick)
3. Click **Run Test** button to verify everything is working
4. If you see errors, check the Troubleshooting section below

### 2. Configure Settings

Set up your compression preferences:

#### Output Format
- **WebP**: Better browser support, good compression
  - Supported by Chrome, Firefox, Edge, Safari 14+
  - Typically 25-35% smaller than JPEG
  
- **AVIF**: Best compression, newer format
  - Supported by Chrome, Firefox, Safari 16+
  - Typically 50% smaller than JPEG
  - May have compatibility issues with older browsers

**Recommendation**: Use WebP for broad compatibility, AVIF for maximum compression on modern sites.

#### Compression Quality
- **Range**: 1-100
- **Default**: 80
- **Guidelines**:
  - 90-100: Near lossless, larger files
  - 80-89: High quality, recommended for most sites
  - 70-79: Good quality, smaller files
  - Below 70: Visible quality loss

**Recommendation**: Start with 80, adjust based on visual quality needs.

#### Automatic Compression
- **Enabled**: All uploaded images are automatically compressed
- **Disabled**: Manual compression via bulk actions only

**Recommendation**: Enable for convenience, disable if you need selective compression.

#### Preserve Original
- **Enabled**: Keeps original images alongside compressed versions
  - Pros: Can revert to originals, multiple format exports
  - Cons: Uses more disk space
  
- **Disabled**: Replaces originals with compressed versions
  - Pros: Saves disk space
  - Cons: Cannot recover originals

**Recommendation**: Disable unless you need originals for specific purposes.

### 3. Test Compression

Before bulk processing:

1. Upload a test image
2. Check the compressed version in Media Library
3. Verify quality is acceptable
4. Adjust settings if needed

## Checking PHP Extensions

### Verify GD or Imagick is Installed

**Method 1: WordPress Site Health**
1. Go to **Tools → Site Health**
2. Click **Info** tab
3. Expand **Server** section
4. Look for GD or Imagick in extensions list

**Method 2: phpinfo()**
1. Create a file `phpinfo.php` in your WordPress root:
   ```php
   <?php phpinfo(); ?>
   ```
2. Visit `yoursite.com/phpinfo.php`
3. Search for "gd" or "imagick"
4. Delete the file after checking

**Method 3: WP-CLI**
```bash
wp cli info
```

### Enabling Extensions

If neither GD nor Imagick is available:

**Shared Hosting**: Contact your hosting provider to enable GD or Imagick

**VPS/Dedicated Server**:
```bash
# Enable GD (Ubuntu/Debian)
sudo apt-get install php-gd
sudo service apache2 restart  # or: sudo service nginx restart

# Enable Imagick (Ubuntu/Debian)
sudo apt-get install php-imagick
sudo service apache2 restart  # or: sudo service nginx restart
```

## Troubleshooting

### No Image Library Available

**Problem**: "No image processing library available"

**Cause**: Neither GD nor Imagick is installed/enabled in PHP

**Solutions**:

1. **Check which extensions are available**:
   ```bash
   php -m | grep -E "gd|imagick"
   ```

2. **Enable GD** (recommended, included with most PHP installations):
   - Shared hosting: Contact support
   - VPS/Dedicated:
     ```bash
     sudo apt-get install php-gd
     sudo service apache2 restart  # or nginx
     ```

3. **Enable Imagick** (better quality):
   - Shared hosting: Contact support
   - VPS/Dedicated:
     ```bash
     sudo apt-get install php-imagick
     sudo service apache2 restart  # or nginx
     ```

### Permission Denied

**Problem**: Cannot write compressed images

**Solutions**:

1. **Fix upload directory permissions**
   ```bash
   sudo chmod -R 755 wp-content/uploads
   sudo chown -R www-data:www-data wp-content/uploads
   ```

2. **Fix plugin directory permissions**
   ```bash
   sudo chmod -R 755 wp-content/plugins/wp-imgpressor
   sudo chown -R www-data:www-data wp-content/plugins/wp-imgpressor
   ```

### Memory Limit Issues

**Problem**: Large images fail to compress

**Solutions**:

1. **Increase PHP memory limit**
   ```php
   // In wp-config.php
   define('WP_MEMORY_LIMIT', '256M');
   define('WP_MAX_MEMORY_LIMIT', '512M');
   ```

2. **Check PHP memory_limit**
   - Edit php.ini: `memory_limit = 256M`
   - Or contact hosting provider

### Compression Not Working

**Problem**: Images upload but don't compress

**Checklist**:

1. ✓ GD or Imagick is available (check Settings page notice)
2. ✓ Automatic compression enabled in settings
3. ✓ Configuration test passes
4. ✓ Supported image format (JPEG, PNG, GIF, WebP)
5. ✓ Target format is supported (check test results)
6. ✓ No PHP errors in WordPress debug log

**Debug steps**:
```php
// Enable WordPress debugging in wp-config.php:
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Then check `wp-content/debug.log` for errors.

## Upgrading

### From Source

```bash
cd wp-content/plugins/wp-imgpressor
git pull origin master
npm install
```

### From ZIP

1. **Backup settings**
   - Export settings if needed
   - Note current configuration

2. **Deactivate (don't delete)**
   - Go to **Plugins**
   - Deactivate WP ImgPressor

3. **Upload new version**
   - Upload new ZIP via WordPress admin
   - Or replace plugin files via FTP/SSH

4. **Reactivate**
   - Activate plugin
   - Verify settings are preserved

## Uninstallation

### Complete Removal

1. **Deactivate plugin**
   - Go to **Plugins**
   - Deactivate WP ImgPressor

2. **Delete plugin**
   - Click **Delete**
   - Confirm deletion

The plugin automatically:
- Deletes all settings
- Removes compression metadata
- Clears cached data

**Note**: Compressed images remain in Media Library. Original images are lost if "Preserve Original" was disabled.

## Next Steps

After installation:

1. ✓ Run configuration test
2. ✓ Configure compression settings
3. ✓ Test with sample images
4. ✓ Enable automatic compression
5. ✓ Bulk compress existing images (optional)
6. ✓ Monitor compression statistics

## Support

If you encounter issues:

1. Check this installation guide
2. Review [README.md](README.md) for usage instructions
3. Enable WordPress debug logging
4. Check server error logs
5. Open an issue on GitHub

## Additional Resources

- **PHP GD Documentation**: https://www.php.net/manual/en/book.image.php
- **ImageMagick Documentation**: https://www.php.net/manual/en/book.imagick.php
- **WordPress Plugins**: https://wordpress.org/plugins/
- **GitHub Repository**: https://github.com/josephjerryrhule/imgpressor
