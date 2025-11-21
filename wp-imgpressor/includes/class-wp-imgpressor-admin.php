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
        $sanitized['max_width'] = isset($input['max_width']) ? max(100, min(10000, intval($input['max_width']))) : 2560;
        $sanitized['max_height'] = isset($input['max_height']) ? max(100, min(10000, intval($input['max_height']))) : 2560;
        $sanitized['compression_speed'] = in_array($input['compression_speed'], array('fast', 'balanced', 'quality')) ? $input['compression_speed'] : 'balanced';
        
        // Remote processing settings
        $sanitized['enable_remote'] = isset($input['enable_remote']) ? true : false;
        $sanitized['api_url'] = esc_url_raw($input['api_url']);
        $sanitized['api_key'] = sanitize_text_field($input['api_key']);
        
        // Performance settings
        $sanitized['enable_lazy_load'] = isset($input['enable_lazy_load']) ? true : false;
        $sanitized['lazy_load_animation'] = in_array($input['lazy_load_animation'], array('fade', 'blur', 'skeleton')) ? $input['lazy_load_animation'] : 'fade';
        $sanitized['add_dimensions'] = isset($input['add_dimensions']) ? true : false;
        $sanitized['preload_lcp'] = isset($input['preload_lcp']) ? true : false;
        
        return $sanitized;
    }
    
    public function display_settings_page() {
        $options = get_option('wp_imgpressor_settings');
        $stats = $this->get_compression_stats();
        $compressor = new WP_ImgPressor_Compressor();
        $library = $compressor->get_available_library();
        
        // Check API connection if enabled
        $api_status = null;
        if (isset($options['enable_remote']) && $options['enable_remote']) {
            $api = new WP_ImgPressor_API();
            $api_status = $api->test_connection();
        }
        ?>
        <div class="wrap wp-imgpressor-settings">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <?php if (!empty($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php _e('Settings saved successfully!', 'wp-imgpressor'); ?></p>
                </div>
            <?php endif; ?>
            
            <?php if (isset($options['enable_remote']) && $options['enable_remote']): ?>
                <?php if ($api_status && $api_status['success']): ?>
                    <div class="notice notice-success">
                        <p><strong><?php _e('Remote Processing Active', 'wp-imgpressor'); ?></strong>: <?php echo esc_html($api_status['message']); ?></p>
                    </div>
                <?php elseif ($api_status): ?>
                    <div class="notice notice-error">
                        <p><strong><?php _e('Remote Processing Error', 'wp-imgpressor'); ?></strong>: <?php echo esc_html($api_status['message']); ?></p>
                        <p><?php _e('Falling back to local processing.', 'wp-imgpressor'); ?></p>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
            
            <?php if (!$library && (!isset($options['enable_remote']) || !$options['enable_remote'])): ?>
                <div class="notice notice-error">
                    <p><strong><?php _e('No image processing library available!', 'wp-imgpressor'); ?></strong></p>
                    <p><?php _e('WP ImgPressor requires either GD or Imagick PHP extension to be installed. Please contact your hosting provider to enable one of these extensions.', 'wp-imgpressor'); ?></p>
                </div>
            <?php elseif ($library && (!isset($options['enable_remote']) || !$options['enable_remote'])): ?>
                <div class="notice notice-info">
                    <p><?php printf(__('Using <strong>%s</strong> for local image processing.', 'wp-imgpressor'), ucfirst($library)); ?></p>
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
                
                <div class="card">
                    <h2><?php _e('Remote Processing (Cloudflare)', 'wp-imgpressor'); ?></h2>
                    <p class="description"><?php _e('Offload image processing to a remote Node.js server (e.g., Cloudflare Pages) for faster performance and reduced server load.', 'wp-imgpressor'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <?php _e('Enable Remote Processing', 'wp-imgpressor'); ?>
                            </th>
                            <td>
                                <label>
                                    <input type="checkbox" name="wp_imgpressor_settings[enable_remote]" 
                                           value="1" <?php checked(isset($options['enable_remote']) ? $options['enable_remote'] : false, true); ?>>
                                    <?php _e('Use remote server for image compression', 'wp-imgpressor'); ?>
                                </label>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="api_url"><?php _e('API URL', 'wp-imgpressor'); ?></label>
                            </th>
                            <td>
                                <input type="url" name="wp_imgpressor_settings[api_url]" id="api_url" 
                                       value="<?php echo esc_attr(isset($options['api_url']) ? $options['api_url'] : ''); ?>" 
                                       class="regular-text" placeholder="https://your-app.pages.dev">
                                <p class="description">
                                    <?php _e('The URL of your deployed Cloudflare Pages or Node.js app.', 'wp-imgpressor'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="api_key"><?php _e('API Key (Optional)', 'wp-imgpressor'); ?></label>
                            </th>
                            <td>
                                <input type="password" name="wp_imgpressor_settings[api_key]" id="api_key" 
                                       value="<?php echo esc_attr(isset($options['api_key']) ? $options['api_key'] : ''); ?>" 
                                       class="regular-text">
                                <p class="description">
                                    <?php _e('If your API requires authentication.', 'wp-imgpressor'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <hr>
                
                <h2><?php _e('General Settings', 'wp-imgpressor'); ?></h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="format"><?php _e('Output Format', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <select name="wp_imgpressor_settings[format]" id="format">
                                <?php
                                $supported_formats = $compressor->get_supported_formats();
                                if (isset($supported_formats['webp'])) {
                                    echo '<option value="webp" ' . selected($options['format'], 'webp', false) . '>WebP (Recommended)</option>';
                                }
                                if (isset($supported_formats['avif'])) {
                                    echo '<option value="avif" ' . selected($options['format'], 'avif', false) . '>AVIF (Best Compression)</option>';
                                }
                                if (empty($supported_formats)) {
                                    echo '<option value="">No formats available</option>';
                                }
                                ?>
                            </select>
                            <p class="description">
                                <?php 
                                if (empty($supported_formats)) {
                                    _e('No compression formats are supported by your server configuration.', 'wp-imgpressor');
                                } elseif (!isset($supported_formats['avif'])) {
                                    _e('WebP is supported. For AVIF support, upgrade to PHP 8.1+ or install ImageMagick 7.0+ with AVIF support.', 'wp-imgpressor');
                                } else {
                                    _e('Choose the format for compressed images. WebP has better compatibility, AVIF offers better compression.', 'wp-imgpressor');
                                }
                                ?>
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
                    
                    <tr>
                        <th scope="row">
                            <label for="compression_speed"><?php _e('Compression Speed', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <select name="wp_imgpressor_settings[compression_speed]" id="compression_speed">
                                <option value="fast" <?php selected($options['compression_speed'], 'fast'); ?>><?php _e('Fast (Lower quality, faster)', 'wp-imgpressor'); ?></option>
                                <option value="balanced" <?php selected($options['compression_speed'], 'balanced'); ?>><?php _e('Balanced (Recommended)', 'wp-imgpressor'); ?></option>
                                <option value="quality" <?php selected($options['compression_speed'], 'quality'); ?>><?php _e('Quality (Best quality, slower)', 'wp-imgpressor'); ?></option>
                            </select>
                            <p class="description">
                                <?php _e('Balance between compression speed and quality. "Fast" is 2-3x faster but slightly larger files.', 'wp-imgpressor'); ?>
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="max_width"><?php _e('Maximum Image Dimensions', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <input type="number" name="wp_imgpressor_settings[max_width]" id="max_width" 
                                   value="<?php echo esc_attr(isset($options['max_width']) ? $options['max_width'] : 2560); ?>" 
                                   min="100" max="10000" step="10" style="width: 100px;">
                            <label for="max_width">Width</label>
                            
                            <input type="number" name="wp_imgpressor_settings[max_height]" id="max_height" 
                                   value="<?php echo esc_attr(isset($options['max_height']) ? $options['max_height'] : 2560); ?>" 
                                   min="100" max="10000" step="10" style="width: 100px; margin-left: 10px;">
                            <label for="max_height">Height</label>
                            
                            <p class="description">
                                <?php _e('Images larger than these dimensions will be resized before compression. This significantly speeds up processing. Recommended: 2560x2560 for 4K displays.', 'wp-imgpressor'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <table class="form-table">
                    <tr>
                        <th scope="row" colspan="2">
                            <h2 class="title"><?php _e('Frontend Performance', 'wp-imgpressor'); ?></h2>
                            <p class="description"><?php _e('Optimize how images are served to your visitors.', 'wp-imgpressor'); ?></p>
                        </th>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="enable_lazy_load"><?php _e('Lazy Loading', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <label class="switch">
                                <input type="checkbox" name="wp_imgpressor_settings[enable_lazy_load]" id="enable_lazy_load" value="1" <?php checked(isset($options['enable_lazy_load']) ? $options['enable_lazy_load'] : false); ?>>
                                <span class="slider round"></span>
                            </label>
                            <p class="description"><?php _e('Enable smart lazy loading with animations. Improves initial page load speed.', 'wp-imgpressor'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="lazy_load_animation"><?php _e('Loading Animation', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <select name="wp_imgpressor_settings[lazy_load_animation]" id="lazy_load_animation">
                                <option value="fade" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'fade'); ?>><?php _e('Fade In', 'wp-imgpressor'); ?></option>
                                <option value="blur" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'blur'); ?>><?php _e('Blur Up', 'wp-imgpressor'); ?></option>
                                <option value="skeleton" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'skeleton'); ?>><?php _e('Skeleton Pulse', 'wp-imgpressor'); ?></option>
                            </select>
                            <p class="description"><?php _e('Choose the visual effect while images are loading.', 'wp-imgpressor'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="add_dimensions"><?php _e('Fix CLS (Add Dimensions)', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <label class="switch">
                                <input type="checkbox" name="wp_imgpressor_settings[add_dimensions]" id="add_dimensions" value="1" <?php checked(isset($options['add_dimensions']) ? $options['add_dimensions'] : false); ?>>
                                <span class="slider round"></span>
                            </label>
                            <p class="description"><?php _e('Automatically add missing width and height attributes to images to prevent Cumulative Layout Shift.', 'wp-imgpressor'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="preload_lcp"><?php _e('Preload LCP Image', 'wp-imgpressor'); ?></label>
                        </th>
                        <td>
                            <label class="switch">
                                <input type="checkbox" name="wp_imgpressor_settings[preload_lcp]" id="preload_lcp" value="1" <?php checked(isset($options['preload_lcp']) ? $options['preload_lcp'] : false); ?>>
                                <span class="slider round"></span>
                            </label>
                            <p class="description"><?php _e('Preload the first image (likely LCP) to improve Core Web Vitals.', 'wp-imgpressor'); ?></p>
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
