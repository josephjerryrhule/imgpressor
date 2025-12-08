<?php
/**
 * Plugin Name: WP ImgPressor
 * Plugin URI: https://github.com/josephjerryrhule/imgpressor
 * Description: Automatically compress and convert uploaded images to WebP or AVIF format using PHP's native GD or Imagick libraries. Zero dependencies - works out-of-the-box! Now with faster compression and automatic format detection.
 * Version: 5.0.3
 * Author: Joseph Jerry Rhule
 * Author URI: https://github.com/josephjerryrhule
 * License: MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: wp-imgpressor
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Define plugin constants
define('WP_IMGPRESSOR_VERSION', '5.0.3');
define('WP_IMGPRESSOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_IMGPRESSOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WP_IMGPRESSOR_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Activation hook
 */
function activate_wp_imgpressor() {
    // Set default options
    $default_options = array(
        'format' => 'webp',
        'quality' => 80,
        'auto_compress' => true,
        'preserve_original' => false,
        'max_width' => 2560,
        'max_height' => 2560,
        'compression_speed' => 'balanced' // fast, balanced, quality
    );
    
    add_option('wp_imgpressor_settings', $default_options);
    
    // Check available image libraries
    $compressor = new WP_ImgPressor_Compressor();
    $library = $compressor->get_available_library();
    
    if (!$library) {
        // Add admin notice if no library is available
        set_transient('wp_imgpressor_no_library_notice', true, 300);
    }
}
register_activation_hook(__FILE__, 'activate_wp_imgpressor');

/**
 * Deactivation hook
 */
function deactivate_wp_imgpressor() {
    // Cleanup if needed
}
register_deactivation_hook(__FILE__, 'deactivate_wp_imgpressor');

/**
 * Load plugin classes
 */
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-admin.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-compressor.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-api.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-frontend.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-background-process.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-license.php';
require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-updater.php';

/**
 * Initialize the plugin
 */
function run_wp_imgpressor() {
    $plugin = new WP_ImgPressor();
    $plugin->run();
}
run_wp_imgpressor();

/**
 * Initialize updater
 */
if (is_admin()) {
    new WP_ImgPressor_Updater(WP_IMGPRESSOR_PLUGIN_BASENAME);
}
