<?php
/**
 * Admin functionality
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Admin {
    
    public function add_admin_menu() {
        add_options_page(
            __('WP ImgPressor Settings', 'wp-imgpressor'),
            __('WP ImgPressor', 'wp-imgpressor'),
            'manage_options',
            'wp-imgpressor',
            array($this, 'display_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('wp_imgpressor_settings', 'wp_imgpressor_settings', array($this, 'sanitize_settings'));
    }
    
    public function sanitize_settings($input) {
        $sanitized = array();
        
        $sanitized['format'] = in_array($input['format'], array('webp', 'avif')) ? $input['format'] : 'webp';
        $sanitized['quality'] = max(1, min(100, intval($input['quality'])));
        $sanitized['auto_compress'] = isset($input['auto_compress']) ? true : false;
        $sanitized['preserve_original'] = isset($input['preserve_original']) ? true : false;
        
        return $sanitized;
    }
    
    public function display_settings_page() {
        $options = get_option('wp_imgpressor_settings');
        $stats = $this->get_compression_stats();
        $compressor = new WP_ImgPressor_Compressor();
        $library = $compressor->get_available_library();
        ?>
        <div class="wrap wp-imgpressor-settings">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <?php if (!empty($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php _e('Settings saved successfully!', 'wp-imgpressor'); ?></p>
                </div>
            <?php endif; ?>
            
            <?php if (!$library): ?>
                <div class="notice notice-error">
                    <p><strong><?php _e('No image processing library available!', 'wp-imgpressor'); ?></strong></p>
                    <p><?php _e('WP ImgPressor requires either GD or Imagick PHP extension to be installed. Please contact your hosting provider to enable one of these extensions.', 'wp-imgpressor'); ?></p>
                </div>
            <?php else: ?>
                <div class="notice notice-info">
                    <p><?php printf(__('Using <strong>%s</strong> for image processing.', 'wp-imgpressor'), ucfirst($library)); ?></p>
                </div>
            <?php endif; ?>
            
            <div class="wp-imgpressor-stats">
                <h2><?php _e('Compression Statistics', 'wp-imgpressor'); ?></h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3><?php echo esc_html($stats['total_compressed']); ?></h3>
                        <p><?php _e('Images Compressed', 'wp-imgpressor'); ?></p>
                    </div>
                    <div class="stat-card">
                        <h3><?php echo esc_html(size_format($stats['space_saved'])); ?></h3>
                        <p><?php _e('Space Saved', 'wp-imgpressor'); ?></p>
                    </div>
                    <div class="stat-card">
                        <h3><?php echo esc_html(round($stats['avg_reduction'], 1)); ?>%</h3>
                        <p><?php _e('Average Reduction', 'wp-imgpressor'); ?></p>
                    </div>
                </div>
            </div>
            
            <form method="post" action="options.php" class="wp-imgpressor-form">
                <?php settings_fields('wp_imgpressor_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="format"><?php _e('Output Format', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <select name="wp_imgpressor_settings[format]" id="format">
                                <option value="webp" <?php selected($options['format'], 'webp'); ?>>WebP</option>
                                <option value="avif" <?php selected($options['format'], 'avif'); ?>>AVIF</option>
                            </select>
                            <p class="description">
                                <?php _e('Choose the format for compressed images. WebP has better compatibility, AVIF offers better compression.', 'wp-imgpressor'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="quality"><?php _e('Compression Quality', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <input type="range" name="wp_imgpressor_settings[quality]" id="quality" 
                                   min="1" max="100" value="<?php echo esc_attr($options['quality']); ?>" 
                                   class="quality-slider">
                            <span class="quality-value"><?php echo esc_html($options['quality']); ?></span>
                            <p class="description">
                                <?php _e('Higher values mean better quality but larger file sizes. Recommended: 80', 'wp-imgpressor'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <?php _e('Automatic Compression', 'wp-imgpressor'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_imgpressor_settings[auto_compress]" 
                                       value="1" <?php checked($options['auto_compress'], true); ?>>
                                <?php _e('Automatically compress images on upload', 'wp-imgpressor'); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <?php _e('Preserve Original', 'wp-imgpressor'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="wp_imgpressor_settings[preserve_original]" 
                                       value="1" <?php checked($options['preserve_original'], true); ?>>
                                <?php _e('Keep original images alongside compressed versions', 'wp-imgpressor'); ?>
                            </label>
                            <p class="description">
                                <?php _e('If unchecked, original images will be replaced with compressed versions.', 'wp-imgpressor'); ?>
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
                <?php submit_button(); ?>
                
                <div class="wp-imgpressor-actions">
                    <h3><?php _e('Test Compression', 'wp-imgpressor'); ?></h3>
                    <p><?php _e('Test your compression settings before applying them.', 'wp-imgpressor'); ?></p>
                    <button type="button" class="button button-secondary" id="test-compression">
                        <?php _e('Run Test', 'wp-imgpressor'); ?>
                    </button>
                    <div id="test-result"></div>
                </div>
            </form>
        </div>
        <?php
    }
    
    public function enqueue_admin_assets($hook) {
        if ($hook !== 'settings_page_wp-imgpressor' && $hook !== 'upload.php') {
            return;
        }
        
        wp_enqueue_style(
            'wp-imgpressor-admin',
            WP_IMGPRESSOR_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            WP_IMGPRESSOR_VERSION
        );
        
        wp_enqueue_script(
            'wp-imgpressor-admin',
            WP_IMGPRESSOR_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WP_IMGPRESSOR_VERSION,
            true
        );
        
        wp_localize_script('wp-imgpressor-admin', 'wpImgpressor', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wp_imgpressor_nonce')
        ));
    }
    
    public function ajax_test_compression() {
        check_ajax_referer('wp_imgpressor_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied', 'wp-imgpressor')));
        }
        
        $compressor = new WP_ImgPressor_Compressor();
        $result = $compressor->test_compression();
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    public function ajax_bulk_compress() {
        check_ajax_referer('wp_imgpressor_nonce', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(array('message' => __('Permission denied', 'wp-imgpressor')));
        }
        
        $attachment_ids = isset($_POST['attachment_ids']) ? array_map('intval', $_POST['attachment_ids']) : array();
        
        $compressor = new WP_ImgPressor_Compressor();
        $results = array();
        
        foreach ($attachment_ids as $id) {
            $results[$id] = $compressor->compress_attachment($id);
        }
        
        wp_send_json_success($results);
    }
    
    public function register_bulk_action($bulk_actions) {
        $bulk_actions['wp_imgpressor_compress'] = __('Compress Images', 'wp-imgpressor');
        return $bulk_actions;
    }
    
    public function handle_bulk_action($redirect_to, $action, $post_ids) {
        if ($action !== 'wp_imgpressor_compress') {
            return $redirect_to;
        }
        
        $compressor = new WP_ImgPressor_Compressor();
        $compressed = 0;
        
        foreach ($post_ids as $post_id) {
            $result = $compressor->compress_attachment($post_id);
            if ($result['success']) {
                $compressed++;
            }
        }
        
        $redirect_to = add_query_arg('wp_imgpressor_compressed', $compressed, $redirect_to);
        return $redirect_to;
    }
    
    public function add_compression_column($columns) {
        $columns['wp_imgpressor'] = __('Compression', 'wp-imgpressor');
        return $columns;
    }
    
    public function display_compression_column($column_name, $post_id) {
        if ($column_name !== 'wp_imgpressor') {
            return;
        }
        
        $compressed = get_post_meta($post_id, '_wp_imgpressor_compressed', true);
        $reduction = get_post_meta($post_id, '_wp_imgpressor_reduction', true);
        
        if ($compressed) {
            echo '<span class="wp-imgpressor-compressed">';
            echo '✓ ' . esc_html(round($reduction, 1)) . '% smaller';
            echo '</span>';
        } else {
            echo '<span class="wp-imgpressor-not-compressed">';
            echo '—';
            echo '</span>';
        }
    }
    
    private function get_compression_stats() {
        global $wpdb;
        
        $total = $wpdb->get_var(
            "SELECT COUNT(*) FROM $wpdb->postmeta WHERE meta_key = '_wp_imgpressor_compressed' AND meta_value = '1'"
        );
        
        $space_saved = $wpdb->get_var(
            "SELECT SUM(CAST(meta_value AS DECIMAL(10,2))) FROM $wpdb->postmeta WHERE meta_key = '_wp_imgpressor_space_saved'"
        );
        
        $avg_reduction = $wpdb->get_var(
            "SELECT AVG(CAST(meta_value AS DECIMAL(10,2))) FROM $wpdb->postmeta WHERE meta_key = '_wp_imgpressor_reduction'"
        );
        
        return array(
            'total_compressed' => intval($total),
            'space_saved' => floatval($space_saved),
            'avg_reduction' => floatval($avg_reduction)
        );
    }
}
