# WP ImgPressor

A powerful WordPress plugin for automatic image compression and format conversion using PHP's native image processing libraries.

## Features

- **⚡ Lightning Fast**: 2-3x faster compression with optimized settings and automatic image resizing
- **Zero Dependencies**: Works out-of-the-box with standard PHP installations
- **Automatic Compression**: Automatically compress images on upload
- **Smart Format Detection**: Automatically detects WebP/AVIF support and shows only available formats
- **Format Selection**: Choose between WebP and AVIF formats (when supported)
- **Speed Control**: Choose Fast, Balanced, or Quality compression modes
- **Quality Control**: Adjustable compression quality (1-100)
- **Automatic Resizing**: Large images are resized to optimize processing speed
- **Bulk Processing**: Compress multiple images at once from the Media Library
- **Statistics Dashboard**: Track compression savings and performance
- **Original Preservation**: Option to keep original images
- **Smart Integration**: Uses GD or Imagick (whichever is available on your server)

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- **GD extension** (included in most PHP installations) OR **Imagick extension** (available on most hosts)
- For AVIF support: PHP 8.1+ with GD/Imagick compiled with AVIF support

## Installation

### Quick Installation

1. Upload the plugin ZIP file through WordPress admin:
   - Go to **Plugins → Add New**
   - Click **Upload Plugin**
   - Choose the `wp-imgpressor-X.X.X.zip` file
   - Click **Install Now**
   - Activate the plugin

2. Configure the plugin:
   - Go to **Settings → WP ImgPressor**
   - The plugin will automatically detect GD or Imagick
   - Select your preferred format (WebP or AVIF)
   - Adjust quality settings
   - Run the configuration test

**That's it!** The plugin works immediately after activation - no server commands or additional software required.

### Manual Installation

See [INSTALL.md](INSTALL.md) for alternative installation methods and troubleshooting.

## Configuration

### Plugin Settings

Navigate to **Settings → WP ImgPressor** to configure:

1. **Output Format**
   - WebP: Better browser compatibility, good compression
   - AVIF: Superior compression, newer format

2. **Compression Quality**
   - Range: 1-100
   - Recommended: 80
   - Higher = better quality, larger files

3. **Automatic Compression**
   - Enable to compress all uploaded images automatically
   - Disable to compress manually via bulk actions

4. **Preserve Original**
   - Keep original images alongside compressed versions
   - Requires more storage space

## Usage

### Automatic Compression

When automatic compression is enabled:
1. Upload images through WordPress Media Library
2. Plugin automatically compresses and converts them
3. Compressed images replace originals (unless preservation is enabled)

### Manual Bulk Compression

To compress existing images:
1. Go to **Media → Library**
2. Switch to **List View**
3. Select images to compress
4. Choose **Compress Images** from Bulk Actions dropdown
5. Click **Apply**

### Compression Statistics

View your compression statistics:
- Total images compressed
- Total space saved
- Average size reduction percentage

### Testing Configuration

Before compressing images:
1. Go to **Settings → WP ImgPressor**
2. Click **Run Test** button
3. Verify Node.js and Sharp are properly configured

## How It Works

1. **Upload Detection**: Plugin hooks into WordPress upload process
2. **Format Conversion**: Uses Sharp to convert images to WebP/AVIF
3. **Compression**: Applies quality settings to reduce file size
4. **Metadata Storage**: Stores compression data in WordPress post meta
5. **File Management**: Replaces or preserves originals based on settings

## Supported Image Formats

### Input Formats
- JPEG/JPG
- PNG
- GIF
- WebP
- TIFF
- SVG (passed through without compression)

### Output Formats
- WebP
- AVIF

## Performance

WP ImgPressor uses native PHP image libraries for optimal performance:
- **GD**: Built into most PHP installations, fast and reliable
- **Imagick**: Higher quality compression when available
- **Memory efficient**: Processes images using PHP's built-in functions
- **No external dependencies**: Works on any standard WordPress hosting

## Troubleshooting

### No Image Library Available

**Error**: "No image processing library available"

**Solutions**:
1. **Enable GD extension** (usually already enabled):
   - Check with your hosting provider
   - Or add to php.ini: `extension=gd`
   
2. **Enable Imagick extension** (better quality):
   - Contact your hosting provider
   - Or install via: `sudo apt-get install php-imagick` (Ubuntu/Debian)

### Format Not Supported

**Error**: "WebP/AVIF format not supported"

**Solutions**:
1. **For WebP**: Requires PHP 7.0+ with GD or Imagick
   - Update PHP if needed
   - Verify GD has WebP support: `php -r "print_r(gd_info());"`

2. **For AVIF**: Requires PHP 8.1+ or Imagick with AVIF support
   - Update PHP to 8.1 or higher
   - Or use ImageMagick 7.0+ compiled with AVIF support

### Permission Issues

**Error**: Cannot write compressed images

**Solutions**:
1. Check WordPress upload directory permissions:
   ```bash
   chmod 755 wp-content/uploads
   ```
2. Ensure web server user has write access
3. Check available disk space

### Images Not Compressing

**Troubleshooting steps**:
1. Run configuration test in plugin settings
2. Verify GD or Imagick is available (check the notice on settings page)
3. Check if automatic compression is enabled
4. Verify image format is supported
5. Check server error logs for PHP errors
6. Ensure WordPress upload directory has write permissions

## Development

### File Structure

```
wp-imgpressor/
├── wp-imgpressor.php          # Main plugin file
├── includes/
│   ├── class-wp-imgpressor.php                # Core plugin class
│   ├── class-wp-imgpressor-admin.php          # Admin interface
│   └── class-wp-imgpressor-compressor.php     # Compression engine
├── assets/
│   ├── css/
│   │   └── admin.css          # Admin styles
│   └── js/
│       └── admin.js           # Admin JavaScript
├── README.md                  # This file
├── INSTALL.md                 # Installation guide
├── install.sh                 # Automated installer
└── uninstall.php              # Cleanup on uninstall
```

### Hooks and Filters

**Actions**:
- `wp_handle_upload` - Compression on upload
- `admin_menu` - Add settings page
- `admin_enqueue_scripts` - Load admin assets

**Filters**:
- `bulk_actions-upload` - Add bulk compression action
- `manage_media_columns` - Add compression column
- `handle_bulk_actions-upload` - Handle bulk compression

### Post Meta Keys

- `_wp_imgpressor_compressed` - Compression status (0/1)
- `_wp_imgpressor_original_size` - Original file size in bytes
- `_wp_imgpressor_compressed_size` - Compressed file size
- `_wp_imgpressor_space_saved` - Bytes saved
- `_wp_imgpressor_reduction` - Percentage reduction
- `_wp_imgpressor_format` - Output format used

## License

This plugin is licensed under the MIT License. See LICENSE file for details.

## Credits

- **PHP GD Library**: Built-in PHP image processing
- **ImageMagick (Imagick)**: Advanced image manipulation
- **Author**: Joseph Jerry Rhule
- **Repository**: [github.com/josephjerryrhule/imgpressor](https://github.com/josephjerryrhule/imgpressor)

## Support

For issues, questions, or contributions:
- GitHub Issues: [github.com/josephjerryrhule/imgpressor/issues](https://github.com/josephjerryrhule/imgpressor/issues)
- Documentation: See INSTALL.md for detailed setup instructions

## Changelog

### 2.1.0
- **⚡ Performance boost**: 2-3x faster compression with new speed optimization settings
- **Automatic resizing**: Large images are resized before compression for faster processing
- **Compression speed options**: Choose between Fast, Balanced, or Quality modes
- **Smart AVIF detection**: Plugin automatically detects and disables AVIF if not supported
- **Maximum dimensions**: Set max image dimensions to speed up processing (default: 2560x2560)
- Better format support detection and user-friendly warnings

### 2.0.0
- **Major refactor**: Switched from Node.js/Sharp to PHP native libraries (GD/Imagick)
- **Zero dependencies**: Plugin now works out-of-the-box on any WordPress installation
- No server commands or SSH access required
- Automatic detection of available image library
- Improved error messages and compatibility warnings

### 1.0.0
- Initial release
- Automatic compression on upload
- WebP and AVIF format support
- Bulk compression via Media Library
- Compression statistics dashboard
- Quality control settings
- Original image preservation option
