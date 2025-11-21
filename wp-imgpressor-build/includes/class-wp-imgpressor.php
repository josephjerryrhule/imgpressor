<?php
/**
 * Main plugin class
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor {
    
    protected $admin;
    protected $compressor;
    protected $frontend;
    
    public function __construct() {
        $this->load_dependencies();
        $this->admin = new WP_ImgPressor_Admin();
        $this->compressor = new WP_ImgPressor_Compressor();
        $this->frontend = new WP_ImgPressor_Frontend();
    }
    
    private function load_dependencies() {
        // Dependencies are already loaded in main plugin file
    }
    
    public function run() {
        // Register admin hooks
        add_action('admin_menu', array($this->admin, 'add_admin_menu'));
        add_action('admin_init', array($this->admin, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this->admin, 'enqueue_admin_assets'));
        
        // Register AJAX handlers
        add_action('wp_ajax_wp_imgpressor_test_compression', array($this->admin, 'ajax_test_compression'));
        add_action('wp_ajax_wp_imgpressor_bulk_compress', array($this->admin, 'ajax_bulk_compress'));
        
        // Register compression hooks
        $options = get_option('wp_imgpressor_settings');
        if (isset($options['auto_compress']) && $options['auto_compress']) {
            add_filter('wp_handle_upload', array($this->compressor, 'compress_on_upload'), 10, 2);
            add_action('add_attachment', array($this->compressor, 'save_compression_metadata'));
        }
        
        // Register bulk action
        add_filter('bulk_actions-upload', array($this->admin, 'register_bulk_action'));
        add_filter('handle_bulk_actions-upload', array($this->admin, 'handle_bulk_action'), 10, 3);
        
        // Add custom column to media library
        add_filter('manage_media_columns', array($this->admin, 'add_compression_column'));
        add_action('manage_media_custom_column', array($this->admin, 'display_compression_column'), 10, 2);
        
        // Initialize frontend optimizations
        $this->frontend->init();
    }
}
