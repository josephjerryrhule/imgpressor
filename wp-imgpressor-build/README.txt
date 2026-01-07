=== WP ImgPressor ===
Contributors: josephjerryrhule
Tags: image, compression, webp, avif, optimization
Requires at least: 5.8
Tested up to: 6.4
Stable tag: 5.0.5
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
2. Install Node.js and Sharp: `sudo npm install -g sharp`
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

= 5.0.5 =
* Production release
* Automatic compression on upload
* WebP and AVIF support
* Bulk compression feature
* Compression statistics
* Original image preservation

== Upgrade Notice ==

= 5.0.5 =
Initial production release with full compression features.
