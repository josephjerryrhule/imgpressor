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
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // AJAX handlers for license
        add_action('wp_ajax_imgpressor_activate_license', array($this, 'ajax_activate_license'));
        add_action('wp_ajax_imgpressor_deactivate_license', array($this, 'ajax_deactivate_license'));
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
        
        // Advanced
        $sanitized['strip_exif'] = isset($input['strip_exif']) ? (bool) $input['strip_exif'] : false;
        $sanitized['backup_original'] = isset($input['backup_original']) ? (bool) $input['backup_original'] : false;
        
        // CDN
        $sanitized['enable_cdn'] = isset($input['enable_cdn']) ? (bool) $input['enable_cdn'] : false;
        $sanitized['cdn_url'] = esc_url_raw($input['cdn_url']);
        $sanitized['cdn_dirs'] = sanitize_text_field($input['cdn_dirs']);
        
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
            <div class="wp-imgpressor-header">
                <div class="wp-imgpressor-title">
                    <h1>🚀 WP ImgPressor <span style="font-size: 14px; background: #e5f5fa; color: #0085ba; padding: 4px 8px; border-radius: 4px; margin-left: 10px;">v<?php echo WP_IMGPRESSOR_VERSION; ?></span></h1>
                </div>
                <div class="wp-imgpressor-actions">
                    <a href="https://github.com/josephjerryrhule/imgpressor" target="_blank" class="wp-imgpressor-btn secondary">GitHub Repo</a>
                </div>
            </div>

            <div class="wp-imgpressor-stats">
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
            
            <h2 class="nav-tab-wrapper wp-imgpressor-tabs">
                <a href="#general" class="nav-tab nav-tab-active" data-tab="general"><?php _e('General Settings', 'wp-imgpressor'); ?></a>
                <a href="#performance" class="nav-tab" data-tab="performance"><?php _e('Performance', 'wp-imgpressor'); ?></a>
                <a href="#license" class="nav-tab" data-tab="license"><?php _e('License', 'wp-imgpressor'); ?></a>
            </h2>
            
            <form method="post" action="options.php" class="wp-imgpressor-form">
                <?php settings_fields('wp_imgpressor_settings'); ?>
                
                <div id="tab-general" class="wp-imgpressor-tab-content active">
                    <div class="card">
                    <h2><?php _e('Remote Processing (Cloudflare)', 'wp-imgpressor'); ?></h2>
                    <p class="description"><?php _e('Offload image processing to a remote Node.js server (e.g., Cloudflare Pages) for faster performance and reduced server load.', 'wp-imgpressor'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <?php _e('Enable Remote Processing', 'wp-imgpressor'); ?>
                            </th>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[enable_remote]" 
                                           value="1" <?php checked(isset($options['enable_remote']) ? $options['enable_remote'] : false, true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Use remote server for image compression', 'wp-imgpressor'); ?></span>
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
                
                <div class="card">
                    <h2><?php _e('Bulk Optimization', 'wp-imgpressor'); ?></h2>
                    <p class="description"><?php _e('Compress all existing images in your Media Library. This process runs in the background.', 'wp-imgpressor'); ?></p>
                    
                    <div class="bulk-optimization-controls">
                        <p>
                            <button type="button" id="start-bulk-optimization" class="button button-primary button-large">
                                <?php _e('Start Bulk Optimization', 'wp-imgpressor'); ?>
                            </button>
                            <span class="spinner"></span>
                        </p>
                        
                        <div id="bulk-optimization-progress" style="display:none; margin-top: 15px;">
                            <div class="wp-imgpressor-progress-bar-container">
                                <div class="wp-imgpressor-progress-bar" style="width: 0%"></div>
                            </div>
                            <p class="progress-text"><?php _e('Preparing...', 'wp-imgpressor'); ?></p>
                        </div>
                        
                        <div id="bulk-optimization-log" style="display:none; margin-top: 15px; max-height: 200px; overflow-y: auto; background: #f0f0f1; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
                    </div>
                </div>

                <div class="card">
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
                                       class="quality-slider" oninput="this.nextElementSibling.value = this.value">
                                <output class="quality-value"><?php echo esc_html($options['quality']); ?></output>
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
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[auto_compress]" 
                                           value="1" <?php checked($options['auto_compress'], true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Automatically compress images on upload', 'wp-imgpressor'); ?></span>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <?php _e('Preserve Original', 'wp-imgpressor'); ?>
                            </th>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[preserve_original]" 
                                           value="1" <?php checked($options['preserve_original'], true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Keep original images alongside compressed versions', 'wp-imgpressor'); ?></span>
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
                </div>

                <div class="card">
                    <h2><?php _e('Advanced Settings', 'wp-imgpressor'); ?></h2>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Strip EXIF Data', 'wp-imgpressor'); ?></th>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[strip_exif]" 
                                           value="1" <?php checked(isset($options['strip_exif']) ? $options['strip_exif'] : false, true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Remove metadata (EXIF, IPTC, XMP) to reduce file size.', 'wp-imgpressor'); ?></span>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Backup Original Images', 'wp-imgpressor'); ?></th>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[backup_original]" 
                                           value="1" <?php checked(isset($options['backup_original']) ? $options['backup_original'] : false, true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Save a copy of the original image to a separate folder before compression.', 'wp-imgpressor'); ?></span>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="card">
                    <h2><?php _e('CDN Settings', 'wp-imgpressor'); ?></h2>
                    <p class="description"><?php _e('Serve your compressed images from a CDN for faster delivery.', 'wp-imgpressor'); ?></p>
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Enable CDN', 'wp-imgpressor'); ?></th>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" name="wp_imgpressor_settings[enable_cdn]" 
                                           value="1" <?php checked(isset($options['enable_cdn']) ? $options['enable_cdn'] : false, true); ?>>
                                    <span class="slider"></span>
                                </label>
                                <span class="description"><?php _e('Rewrite image URLs to use CDN.', 'wp-imgpressor'); ?></span>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="cdn_url"><?php _e('CDN URL', 'wp-imgpressor'); ?></label></th>
                            <td>
                                <input type="url" name="wp_imgpressor_settings[cdn_url]" id="cdn_url" 
                                       value="<?php echo esc_attr(isset($options['cdn_url']) ? $options['cdn_url'] : ''); ?>" 
                                       class="regular-text" placeholder="https://cdn.example.com">
                                <p class="description"><?php _e('The base URL of your CDN (e.g., https://cdn.example.com).', 'wp-imgpressor'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="cdn_dirs"><?php _e('Included Directories', 'wp-imgpressor'); ?></label></th>
                            <td>
                                <input type="text" name="wp_imgpressor_settings[cdn_dirs]" id="cdn_dirs" 
                                       value="<?php echo esc_attr(isset($options['cdn_dirs']) ? $options['cdn_dirs'] : 'wp-content/uploads'); ?>" 
                                       class="regular-text">
                                <p class="description"><?php _e('Comma-separated list of directories to rewrite (default: wp-content/uploads).', 'wp-imgpressor'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>

                </div><!-- #tab-general -->

                <div id="tab-performance" class="wp-imgpressor-tab-content" style="display:none;">
                    <div class="card">
                        <h2><?php _e('Performance Settings', 'wp-imgpressor'); ?></h2>
                        <table class="form-table">
                            <tr>
                                <th scope="row"><?php _e('Lazy Load Images', 'wp-imgpressor'); ?></th>
                                <td>
                                    <label class="switch">
                                        <input type="checkbox" name="wp_imgpressor_settings[enable_lazy_load]" 
                                               value="1" <?php checked(isset($options['enable_lazy_load']) ? $options['enable_lazy_load'] : false, true); ?>>
                                        <span class="slider"></span>
                                    </label>
                                    <span class="description"><?php _e('Defer loading of off-screen images to improve page load speed.', 'wp-imgpressor'); ?></span>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="lazy_load_animation"><?php _e('Lazy Load Animation', 'wp-imgpressor'); ?></label></th>
                                <td>
                                    <select name="wp_imgpressor_settings[lazy_load_animation]" id="lazy_load_animation">
                                        <option value="fade" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'fade'); ?>><?php _e('Fade In', 'wp-imgpressor'); ?></option>
                                        <option value="blur" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'blur'); ?>><?php _e('Blur Up', 'wp-imgpressor'); ?></option>
                                        <option value="skeleton" <?php selected(isset($options['lazy_load_animation']) ? $options['lazy_load_animation'] : 'fade', 'skeleton'); ?>><?php _e('Skeleton', 'wp-imgpressor'); ?></option>
                                    </select>
                                    <p class="description"><?php _e('Choose the loading animation effect for lazy-loaded images.', 'wp-imgpressor'); ?></p>
                                    
                                    <!-- Animation Preview -->
                                    <div class="animation-preview-container" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
                                        <p><strong><?php _e('Preview:', 'wp-imgpressor'); ?></strong></p>
                                        <div class="animation-preview-box" style="width: 200px; height: 150px; background: #e0e0e0; position: relative; overflow: hidden; border-radius: 4px;">
                                            <img class="preview-image" 
                                                 src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%234A90E2' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='16' fill='white'%3ESample Image%3C/text%3E%3C/svg%3E"
                                                 style="width: 100%; height: 100%; object-fit: cover; opacity: 0;"
                                                 alt="Preview">
                                        </div>
                                        <button type="button" id="replay-animation" class="button button-small" style="margin-top: 10px;">
                                            <?php _e('Replay Animation', 'wp-imgpressor'); ?>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Add Missing Dimensions', 'wp-imgpressor'); ?></th>
                                <td>
                                    <label class="switch">
                                        <input type="checkbox" name="wp_imgpressor_settings[add_dimensions]" 
                                               value="1" <?php checked(isset($options['add_dimensions']) ? $options['add_dimensions'] : false, true); ?>>
                                        <span class="slider"></span>
                                    </label>
                                    <span class="description"><?php _e('Automatically add width and height attributes to reduce layout shifts (CLS).', 'wp-imgpressor'); ?></span>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><?php _e('Preload LCP Image', 'wp-imgpressor'); ?></th>
                                <td>
                                    <label class="switch">
                                        <input type="checkbox" name="wp_imgpressor_settings[preload_lcp]" 
                                               value="1" <?php checked(isset($options['preload_lcp']) ? $options['preload_lcp'] : false, true); ?>>
                                        <span class="slider"></span>
                                    </label>
                                    <span class="description"><?php _e('Attempt to preload the Largest Contentful Paint image for better Core Web Vitals.', 'wp-imgpressor'); ?></span>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div id="tab-license" class="wp-imgpressor-tab-content" style="display:none;">
                    <div class="card">
                        <h2><?php _e('License Activation', 'wp-imgpressor'); ?></h2>
                        <p class="description"><?php _e('Activate your license to unlock premium features.', 'wp-imgpressor'); ?></p>
                        
                        <?php 
                        $license = new WP_ImgPressor_License();
                        $license_data = $license->get_display_data();
                        ?>
                        
                        <div class="license-status-area <?php echo $license_data['is_active'] ? 'active' : 'inactive'; ?>">
                            <?php if ($license_data['is_active']): ?>
                                <div class="license-active-details">
                                    <div class="license-badge badge-<?php echo esc_attr($license_data['tier']); ?>">
                                        <?php echo esc_html(ucfirst($license_data['tier'])); ?> Plan
                                    </div>
                                    <p><strong>Status:</strong> <span class="status-active">Active</span></p>
                                    <p><strong>Expires:</strong> <?php echo $license_data['expires_at'] ? date_i18n(get_option('date_format'), strtotime($license_data['expires_at'])) : 'Never'; ?></p>
                                    
                                    <?php if ($license_data['quota']['monthly_limit'] > 0): ?>
                                        <div class="quota-progress">
                                            <p><strong>API Usage:</strong> <?php echo esc_html($license_data['quota']['used']); ?> / <?php echo esc_html($license_data['quota']['monthly_limit']); ?></p>
                                            <progress value="<?php echo esc_attr($license_data['quota']['used']); ?>" max="<?php echo esc_attr($license_data['quota']['monthly_limit']); ?>"></progress>
                                        </div>
                                    <?php endif; ?>
                                    
                                    <button type="button" id="deactivate-license-btn" class="button button-secondary">Deactivate License</button>
                                </div>
                            <?php else: ?>
                                <div class="license-activation-form">
                                    <table class="form-table">
                                        <tr>
                                            <th scope="row"><label for="license_key">License Key</label></th>
                                            <td>
                                                <input type="text" id="license_key" class="regular-text" placeholder="XXXX-XXXX-XXXX-XXXX">
                                                <p class="description">Enter your license key received via email.</p>
                                            </td>
                                        </tr>
                                    </table>
                                    <button type="button" id="activate-license-btn" class="button button-primary">Activate License</button>
                                    <span class="spinner" style="float:none;"></span>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <p class="submit">
                    <input type="submit" name="submit" id="submit" class="button button-primary" value="<?php _e('Save Changes', 'wp-imgpressor'); ?>">
                </p>
            </form>
        </div>
        <?php
    }
    
    public function enqueue_admin_assets($hook) {
        if ('settings_page_wp-imgpressor' === $hook) {
            wp_enqueue_script('wp-imgpressor-admin', WP_IMGPRESSOR_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), WP_IMGPRESSOR_VERSION, true);
            wp_enqueue_style('wp-imgpressor-admin', WP_IMGPRESSOR_PLUGIN_URL . 'assets/css/admin.css', array(), WP_IMGPRESSOR_VERSION);
            wp_enqueue_style('wp-imgpressor-admin-animations', WP_IMGPRESSOR_PLUGIN_URL . 'assets/css/admin-animations.css', array(), WP_IMGPRESSOR_VERSION);
            
            wp_localize_script('wp-imgpressor-admin', 'wpImgpressor', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wp_imgpressor_nonce')
            ));
        }
        
        // Enqueue global script for toast notifications
        wp_enqueue_style('wp-imgpressor-global', WP_IMGPRESSOR_PLUGIN_URL . 'assets/css/admin.css', array(), WP_IMGPRESSOR_VERSION);
        wp_enqueue_script('wp-imgpressor-global', WP_IMGPRESSOR_PLUGIN_URL . 'assets/js/admin-global.js', array('jquery'), WP_IMGPRESSOR_VERSION, true);
        
        wp_localize_script('wp-imgpressor-global', 'wpImgpressor', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wp_imgpressor_nonce'),
            'compressing_text' => __('Compressing...', 'wp-imgpressor'),
            'done_text' => __('Done', 'wp-imgpressor')
        ));
    }

    public function ajax_start_bulk() {
        check_ajax_referer('wp_imgpressor_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied', 'wp-imgpressor')));
        }
        
        $bg_process = new WP_ImgPressor_Background_Process();
        $result = $bg_process->start_process();
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }
    
    public function ajax_check_status() {
        check_ajax_referer('wp_imgpressor_nonce', 'nonce');
        
        $bg_process = new WP_ImgPressor_Background_Process();
        $status = $bg_process->get_status();
        
        wp_send_json_success($status);
    }
    
    public function ajax_clear_status() {
        check_ajax_referer('wp_imgpressor_nonce', 'nonce');
        
        $bg_process = new WP_ImgPressor_Background_Process();
        $bg_process->clear_completion_flag();
        
        wp_send_json_success();
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

    /**
     * AJAX handler for license activation
     */
    public function ajax_activate_license() {
        check_ajax_referer('imgpressor_license_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('Permission denied', 'wp-imgpressor'));
        }
        
        $license_key = isset($_POST['license_key']) ? sanitize_text_field($_POST['license_key']) : '';
        
        if (empty($license_key)) {
            wp_send_json_error(__('License key is required', 'wp-imgpressor'));
        }
        
        $license_manager = new WP_ImgPressor_License();
        $result = $license_manager->activate_license($license_key);
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for license deactivation
     */
    public function ajax_deactivate_license() {
        check_ajax_referer('imgpressor_license_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('Permission denied', 'wp-imgpressor'));
        }
        
        $license_manager = new WP_ImgPressor_License();
        $result = $license_manager->deactivate_license();
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result['message']);
        }
    }
}