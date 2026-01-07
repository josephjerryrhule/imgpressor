<?php
/**
 * Frontend optimization functionality
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Frontend {

    private $options;

    public function __construct() {
        $this->options = get_option('wp_imgpressor_settings');
    }

    /**
     * Initialize frontend hooks
     */
    public function init() {
        // Only run on frontend
        if (is_admin()) {
            return;
        }

        $options = get_option('wp_imgpressor_settings');
        
        // CDN Rewriting
        if (isset($options['enable_cdn']) && $options['enable_cdn'] && !empty($options['cdn_url'])) {
            add_action('template_redirect', array($this, 'start_buffer'), 1);
        }
        
        // Lazy Loading
        if (isset($options['enable_lazy_load']) && $options['enable_lazy_load']) {
            add_filter('the_content', array($this, 'filter_content'));
            add_action('wp_enqueue_scripts', array($this, 'enqueue_frontend_assets'));
        }
        
        // Add Dimensions (CLS)
        if (isset($options['add_dimensions']) && $options['add_dimensions']) {
            add_filter('the_content', array($this, 'add_image_dimensions'));
        }
        
        // Preload LCP
        if (isset($options['preload_lcp']) && $options['preload_lcp']) {
            add_action('wp_head', array($this, 'preload_lcp_image'), 1);
        }
    }
    
    public function start_buffer() {
        ob_start(array($this, 'rewrite_cdn_urls'));
    }
    
    public function rewrite_cdn_urls($content) {
        $options = get_option('wp_imgpressor_settings');
        $cdn_url = rtrim($options['cdn_url'], '/');
        $site_url = rtrim(site_url(), '/');
        $dirs = isset($options['cdn_dirs']) ? explode(',', $options['cdn_dirs']) : array('wp-content/uploads');
        
        if (empty($cdn_url) || empty($content)) {
            return $content;
        }
        
        foreach ($dirs as $dir) {
            $dir = trim($dir);
            if (empty($dir)) continue;
            
            $base_url = $site_url . '/' . $dir;
            $cdn_base_url = $cdn_url . '/' . $dir;
            
            // Escape for regex
            $base_url_regex = preg_quote($base_url, '/');
            
            // Replace URLs
            // Matches src="...", href="...", srcset="..." containing the base URL
            $content = preg_replace(
                '/(src|href|srcset)=["\']' . $base_url_regex . '(.*?)["\']/i', 
                '$1="' . $cdn_base_url . '$2"', 
                $content
            );
            
            // Also handle escaped JSON URLs (often found in data attributes or scripts)
            $base_url_json = str_replace('/', '\/', $base_url);
            $cdn_base_url_json = str_replace('/', '\/', $cdn_base_url);
            $content = str_replace($base_url_json, $cdn_base_url_json, $content);
        }
        
        return $content;
    }

    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_frontend_assets() {
        wp_enqueue_style(
            'wp-imgpressor-frontend',
            WP_IMGPRESSOR_PLUGIN_URL . 'assets/css/frontend.css',
            array(),
            WP_IMGPRESSOR_VERSION
        );

        wp_enqueue_script(
            'wp-imgpressor-lazy-load',
            WP_IMGPRESSOR_PLUGIN_URL . 'assets/js/lazy-load.js',
            array(),
            WP_IMGPRESSOR_VERSION,
            true
        );
        
        // Pass options to JS
        wp_localize_script('wp-imgpressor-lazy-load', 'wpImgPressor', array(
            'animation' => isset($this->options['lazy_load_animation']) ? $this->options['lazy_load_animation'] : 'fade',
            'threshold' => 50 // Load 50px before viewport
        ));
    }

    /**
     * Filter content to apply lazy loading
     */
    public function filter_content($content) {
        return $this->filter_html($content);
    }

    /**
     * Filter HTML to replace img tags (background images are NOT lazy loaded)
     */
    public function filter_html($html) {
        // Don't lazy load in feeds or previews
        if (is_feed() || is_preview()) {
            return $html;
        }

        // Find all img tags
        $html = preg_replace_callback('/<img([^>]+)>/i', array($this, 'replace_image'), $html);
        
        return $html;
    }

    /**
     * Replace image tag with lazy load markup
     */
    private function replace_image($matches) {
        $attributes = $matches[1];
        
        // Skip if already has data-src or is a tracking pixel (1x1)
        if (strpos($attributes, 'data-src') !== false || strpos($attributes, 'width="1"') !== false) {
            return $matches[0];
        }
        
        // Skip if class contains 'no-lazy'
        if (strpos($attributes, 'no-lazy') !== false) {
            return $matches[0];
        }

        // Extract src
        if (!preg_match('/src=["\'](.*?)["\']/i', $attributes, $src_match)) {
            return $matches[0];
        }
        $src = $src_match[1];

        // Extract class
        $class = '';
        if (preg_match('/class=["\'](.*?)["\']/i', $attributes, $class_match)) {
            $class = $class_match[1];
            $attributes = str_replace($class_match[0], '', $attributes); // Remove class attribute to re-add later
        }

        // Add lazy load classes
        $new_class = trim($class . ' wp-imgpressor-lazy');
        
        // Animation specific classes
        $animation = isset($this->options['lazy_load_animation']) ? $this->options['lazy_load_animation'] : 'fade';
        $new_class .= ' lazy-' . $animation;

        // Create placeholder (transparent 1x1 pixel)
        $placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        
        // If blur-up, use a tiny version of the image (if we could generate it on the fly, but for now use placeholder)
        // For now, we'll just use the placeholder. Real LQIP would require generating extra images.

        // Replace src with placeholder and add data-src
        $new_attributes = str_replace('src="' . $src . '"', 'src="' . $placeholder . '" data-src="' . $src . '"', $attributes);
        $new_attributes = str_replace("src='" . $src . "'", "src='" . $placeholder . "' data-src='" . $src . "'", $new_attributes);
        
        // Handle srcset
        if (preg_match('/srcset=["\'](.*?)["\']/i', $attributes, $srcset_match)) {
            $srcset = $srcset_match[1];
            $new_attributes = str_replace('srcset="' . $srcset . '"', 'data-srcset="' . $srcset . '"', $new_attributes);
            $new_attributes = str_replace("srcset='" . $srcset . "'", "data-srcset='" . $srcset . "'", $new_attributes);
        }

        return '<img class="' . esc_attr($new_class) . '" ' . $new_attributes . '>';
    }

    /**
     * Add missing width and height attributes to images
     */
    public function add_image_dimensions($content) {
        if (!function_exists('getimagesize')) {
            return $content;
        }

        return preg_replace_callback('/<img([^>]+)>/i', function($matches) {
            $img_tag = $matches[0];
            $attrs = $matches[1];

            // Check if width and height already exist
            if (strpos($attrs, 'width=') !== false && strpos($attrs, 'height=') !== false) {
                return $img_tag;
            }

            // Get src
            if (preg_match('/src=["\'](.*?)["\']/i', $attrs, $src_match)) {
                $src = $src_match[1];
                
                // Convert URL to local path if possible
                $upload_dir = wp_upload_dir();
                $base_url = $upload_dir['baseurl'];
                $base_dir = $upload_dir['basedir'];

                if (strpos($src, $base_url) !== false) {
                    $path = str_replace($base_url, $base_dir, $src);
                    
                    if (file_exists($path)) {
                        $size = getimagesize($path);
                        if ($size) {
                            $width = $size[0];
                            $height = $size[1];
                            
                            // Add width if missing
                            if (strpos($attrs, 'width=') === false) {
                                $img_tag = str_replace('<img', '<img width="' . $width . '"', $img_tag);
                            }
                            
                            // Add height if missing
                            if (strpos($attrs, 'height=') === false) {
                                $img_tag = str_replace('<img', '<img height="' . $height . '"', $img_tag);
                            }
                        }
                    }
                }
            }
            
            return $img_tag;
        }, $content);
    }
    
    /**
     * Preload LCP Image
     * Attempts to find the first image in the post content and preload it
     */
    public function preload_lcp_image() {
        if (!is_single() && !is_page()) {
            return;
        }
        
        global $post;
        if (!$post) return;
        
        // Check for featured image first
        if (has_post_thumbnail($post->ID)) {
            $image_id = get_post_thumbnail_id($post->ID);
            $image_src = wp_get_attachment_image_src($image_id, 'full');
            if ($image_src) {
                echo '<link rel="preload" as="image" href="' . esc_url($image_src[0]) . '">';
                return;
            }
        }
        
        // Fallback to first image in content
        if (preg_match('/<img[^>]+src=["\'](.*?)["\']/i', $post->post_content, $matches)) {
            echo '<link rel="preload" as="image" href="' . esc_url($matches[1]) . '">';
        }
    }
}
