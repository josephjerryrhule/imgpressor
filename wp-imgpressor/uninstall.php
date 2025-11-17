<?php
/**
 * Uninstall script for WP ImgPressor
 *
 * @package WP_ImgPressor
 */

// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Delete plugin options
delete_option('wp_imgpressor_settings');

// Delete all post meta created by the plugin
global $wpdb;

$wpdb->query("DELETE FROM $wpdb->postmeta WHERE meta_key LIKE '_wp_imgpressor_%'");

// Clear any cached data
wp_cache_flush();
