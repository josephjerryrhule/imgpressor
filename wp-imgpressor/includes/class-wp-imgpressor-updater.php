<?php
/**
 * GitHub Auto-Updater
 * Enables automatic plugin updates from GitHub releases
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Updater {
    
    private $github_username = 'josephjerryrhule'; // TODO: Update
    private $github_repo = 'imgpressor'; // TODO: Update
    private $plugin_slug;
    private $plugin_basename;
    private $github_response;
    
    public function __construct($plugin_basename) {
        $this->plugin_basename = $plugin_basename;
        $this->plugin_slug = dirname($plugin_basename);
        
        // Hook into WordPress update system
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_update'));
        add_filter('plugins_api', array($this, 'plugin_info'), 10, 3);
        add_filter('upgrader_post_install', array($this, 'after_install'), 10, 3);
    }
    
    /**
     * Get latest release information from GitHub
     */
    private function get_github_release() {
        if (!empty($this->github_response)) {
            return $this->github_response;
        }
        
        $url = "https://api.github.com/repos/{$this->github_username}/{$this->github_repo}/releases/latest";
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Accept' => 'application/vnd.github.v3+json',
                'User-Agent' => 'WP-ImgPressor-Updater'
            ),
            'timeout' => 15
        ));
        
        if (is_wp_error($response)) {
            return false;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!isset($data['tag_name'])) {
            return false;
        }
        
        $this->github_response = $data;
        return $data;
    }
    
    /**
     * Check for plugin updates
     */
    public function check_update($transient) {
        if (empty($transient->checked)) {
            return $transient;
        }
        
        $release = $this->get_github_release();
        
        if (!$release) {
            return $transient;
        }
        
        // Get version from tag (remove 'v' prefix if present)
        $github_version = ltrim($release['tag_name'], 'v');
        $current_version = WP_IMGPRESSOR_VERSION;
        
        // Compare versions
        if (version_compare($github_version, $current_version, '>')) {
            // Find the ZIP asset
            $download_url = $this->get_download_url($release);
            
            if ($download_url) {
                $plugin_data = array(
                    'slug' => $this->plugin_slug,
                    'new_version' => $github_version,
                    'url' => $release['html_url'],
                    'package' => $download_url,
                    'tested' => $this->get_tested_version($release),
                    'requires' => $this->get_requires_version($release),
                    'requires_php' => '7.4'
                );
                
                $transient->response[$this->plugin_basename] = (object) $plugin_data;
            }
        }
        
        return $transient;
    }
    
    /**
     * Get download URL from release assets
     */
    private function get_download_url($release) {
        if (!isset($release['assets']) || empty($release['assets'])) {
            // Use source code ZIP as fallback
            return isset($release['zipball_url']) ? $release['zipball_url'] : false;
        }
        
        // Look for the plugin ZIP file
        foreach ($release['assets'] as $asset) {
            if (strpos($asset['name'], 'wp-imgpressor') !== false && substr($asset['name'], -4) === '.zip') {
                return $asset['browser_download_url'];
            }
        }
        
        return false;
    }
    
    /**
     * Get tested WordPress version from release
     */
    private function get_tested_version($release) {
        // Try to extract from release body
        if (isset($release['body']) && preg_match('/Tested up to: ([0-9.]+)/i', $release['body'], $matches)) {
            return $matches[1];
        }
        
        return get_bloginfo('version');
    }
    
    /**
     * Get required WordPress version from release
     */
    private function get_requires_version($release) {
        // Try to extract from release body
        if (isset($release['body']) && preg_match('/Requires at least: ([0-9.]+)/i', $release['body'], $matches)) {
            return $matches[1];
        }
        
        return '5.0';
    }
    
    /**
     * Provide plugin information for update screen
     */
    public function plugin_info($false, $action, $args) {
        if ($action !== 'plugin_information') {
            return $false;
        }
        
        if (!isset($args->slug) || $args->slug !== $this->plugin_slug) {
            return $false;
        }
        
        $release = $this->get_github_release();
        
        if (!$release) {
            return $false;
        }
        
        $github_version = ltrim($release['tag_name'], 'v');
        
        $plugin_info = new stdClass();
        $plugin_info->name = 'WP ImgPressor';
        $plugin_info->slug = $this->plugin_slug;
        $plugin_info->version = $github_version;
        $plugin_info->author = '<a href="https://github.com/' . $this->github_username . '">Joseph Jerry Rhule</a>';
        $plugin_info->homepage = 'https://github.com/' . $this->github_username . '/' . $this->github_repo;
        $plugin_info->requires = $this->get_requires_version($release);
        $plugin_info->tested = $this->get_tested_version($release);
        $plugin_info->requires_php = '7.4';
        $plugin_info->download_link = $this->get_download_url($release);
        $plugin_info->sections = array(
            'description' => $this->get_description(),
            'changelog' => $this->format_changelog($release)
        );
        $plugin_info->banners = array(
            'low' => 'https://raw.githubusercontent.com/' . $this->github_username . '/' . $this->github_repo . '/main/assets/banner-772x250.png',
            'high' => 'https://raw.githubusercontent.com/' . $this->github_username . '/' . $this->github_repo . '/main/assets/banner-1544x500.png'
        );
        
        return $plugin_info;
    }
    
    /**
     * Get plugin description
     */
    private function get_description() {
        return '<p>Automatically compress and convert uploaded images to WebP or AVIF format using PHP\'s native GD or Imagick libraries. Zero dependencies - works out-of-the-box!</p>' .
               '<h3>Features</h3>' .
               '<ul>' .
               '<li>🚀 Automatic compression on upload</li>' .
               '<li>📦 Bulk optimization</li>' .
               '<li>📊 Analytics dashboard</li>' .
               '<li>⏰ Scheduled optimization</li>' .
               '<li>🎨 Smart compression presets</li>' .
               '<li>🔄 Restore from backup</li>' .
               '<li>💎 Premium features with subscription</li>' .
               '</ul>';
    }
    
    /**
     * Format changelog from GitHub release
     */
    private function format_changelog($release) {
        if (!isset($release['body'])) {
            return '<p>See <a href="' . $release['html_url'] . '" target="_blank">GitHub release</a> for details.</p>';
        }
        
        // Convert Markdown to HTML (basic conversion)
        $changelog = $release['body'];
        $changelog = $this->markdown_to_html($changelog);
        
        return '<h4>Version ' . ltrim($release['tag_name'], 'v') . '</h4>' . $changelog;
    }
    
    /**
     * Basic Markdown to HTML conversion
     */
    private function markdown_to_html($text) {
        // Convert headers
        $text = preg_replace('/^### (.+)$/m', '<h5>$1</h5>', $text);
        $text = preg_replace('/^## (.+)$/m', '<h4>$1</h4>', $text);
        $text = preg_replace('/^# (.+)$/m', '<h3>$1</h3>', $text);
        
        // Convert bold
        $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text);
        
        // Convert links
        $text = preg_replace('/\[(.+?)\]\((.+?)\)/', '<a href="$2">$1</a>', $text);
        
        // Convert lists
        $text = preg_replace('/^- (.+)$/m', '<li>$1</li>', $text);
        $text = preg_replace('/(<li>.*<\/li>\n?)+/s', '<ul>$0</ul>', $text);
        
        // Convert line breaks
        $text = nl2br($text);
        
        return $text;
    }
    
    /**
     * Handle post-installation
     */
    public function after_install($response, $hook_extra, $result) {
        global $wp_filesystem;
        
        $plugin_folder = WP_PLUGIN_DIR . DIRECTORY_SEPARATOR . $this->plugin_slug;
        $wp_filesystem->move($result['destination'], $plugin_folder);
        $result['destination'] = $plugin_folder;
        
        // Activate plugin if it was active before
        if (is_plugin_active($this->plugin_basename)) {
            activate_plugin($this->plugin_basename);
        }
        
        return $result;
    }
    
    /**
     * Manual update check (for admin button)
     */
    public function force_check() {
        delete_site_transient('update_plugins');
        wp_update_plugins();
    }
}
