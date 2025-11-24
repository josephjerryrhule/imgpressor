<?php
/**
 * License Management System
 * Handles license validation, activation, and subscription management
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_License {
    
    const LICENSE_OPTION = 'wp_imgpressor_license_key';
    const STATUS_OPTION = 'wp_imgpressor_license_status';
    const DATA_OPTION = 'wp_imgpressor_license_data';
    const API_ENDPOINT = 'http://localhost:3000/api/license'; // Localhost for testing
    
    // License statuses
    const STATUS_ACTIVE = 'active';
    const STATUS_EXPIRED = 'expired';
    const STATUS_INVALID = 'invalid';
    const STATUS_SUSPENDED = 'suspended';
    const STATUS_DEACTIVATED = 'deactivated';
    
    // Subscription tiers
    const TIER_FREE = 'free';
    const TIER_STARTER = 'starter';
    const TIER_PRO = 'pro';
    const TIER_AGENCY = 'agency';
    
    private $license_key;
    private $license_data;
    
    public function __construct() {
        $this->license_key = $this->get_license_key();
        $this->license_data = $this->get_license_data();
        
        // Schedule daily license check
        add_action('wp_imgpressor_daily_license_check', array($this, 'validate_license'));
        if (!wp_next_scheduled('wp_imgpressor_daily_license_check')) {
            wp_schedule_event(time(), 'daily', 'wp_imgpressor_daily_license_check');
        }
    }
    
    /**
     * Get stored license key (decrypted)
     */
    private function get_license_key() {
        $encrypted = get_option(self::LICENSE_OPTION, '');
        if (empty($encrypted)) {
            return '';
        }
        return $this->decrypt($encrypted);
    }
    
    /**
     * Get stored license data
     */
    private function get_license_data() {
        return get_option(self::DATA_OPTION, array(
            'status' => self::STATUS_INVALID,
            'tier' => self::TIER_FREE,
            'expires_at' => null,
            'activations' => 0,
            'max_activations' => 1,
            'quota' => array(
                'monthly_limit' => 0,
                'used' => 0,
                'reset_date' => null
            )
        ));
    }
    
    /**
     * Activate license key
     */
    public function activate_license($license_key) {
        // Validate format
        if (!$this->is_valid_format($license_key)) {
            return array(
                'success' => false,
                'message' => __('Invalid license key format', 'wp-imgpressor')
            );
        }
        
        // Call API to activate
        $response = wp_remote_post(self::API_ENDPOINT . '/activate', array(
            'body' => json_encode(array(
                'license_key' => $license_key,
                'domain' => home_url(),
                'site_name' => get_bloginfo('name'),
                'wp_version' => get_bloginfo('version'),
                'plugin_version' => WP_IMGPRESSOR_VERSION
            )),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 15
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => __('Could not connect to license server: ', 'wp-imgpressor') . $response->get_error_message()
            );
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['success']) && $body['success']) {
            // Store encrypted license key
            update_option(self::LICENSE_OPTION, $this->encrypt($license_key));
            update_option(self::STATUS_OPTION, self::STATUS_ACTIVE);
            update_option(self::DATA_OPTION, $body['data']);
            
            $this->license_key = $license_key;
            $this->license_data = $body['data'];
            
            return array(
                'success' => true,
                'message' => __('License activated successfully!', 'wp-imgpressor'),
                'data' => $body['data']
            );
        }
        
        return array(
            'success' => false,
            'message' => isset($body['message']) ? $body['message'] : __('License activation failed', 'wp-imgpressor')
        );
    }
    
    /**
     * Deactivate license
     */
    public function deactivate_license() {
        if (empty($this->license_key)) {
            return array(
                'success' => false,
                'message' => __('No license key to deactivate', 'wp-imgpressor')
            );
        }
        
        // Call API to deactivate
        $response = wp_remote_post(self::API_ENDPOINT . '/deactivate', array(
            'body' => json_encode(array(
                'license_key' => $this->license_key,
                'domain' => home_url()
            )),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 15
        ));
        
        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            
            if (isset($body['success']) && $body['success']) {
                // Clear local license data
                delete_option(self::LICENSE_OPTION);
                delete_option(self::STATUS_OPTION);
                delete_option(self::DATA_OPTION);
                
                $this->license_key = '';
                $this->license_data = array();
                
                return array(
                    'success' => true,
                    'message' => __('License deactivated successfully', 'wp-imgpressor')
                );
            }
        }
        
        // Even if API call fails, clear local data
        delete_option(self::LICENSE_OPTION);
        delete_option(self::STATUS_OPTION);
        delete_option(self::DATA_OPTION);
        
        return array(
            'success' => true,
            'message' => __('License deactivated locally', 'wp-imgpressor')
        );
    }
    
    /**
     * Validate license (called daily via cron)
     */
    public function validate_license() {
        if (empty($this->license_key)) {
            return false;
        }
        
        $response = wp_remote_post(self::API_ENDPOINT . '/validate', array(
            'body' => json_encode(array(
                'license_key' => $this->license_key,
                'domain' => home_url()
            )),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 15
        ));
        
        if (is_wp_error($response)) {
            // If validation fails, use grace period
            return $this->handle_grace_period();
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['success']) && $body['success']) {
            update_option(self::STATUS_OPTION, self::STATUS_ACTIVE);
            update_option(self::DATA_OPTION, $body['data']);
            $this->license_data = $body['data'];
            return true;
        } else {
            // License invalid or expired
            $status = isset($body['status']) ? $body['status'] : self::STATUS_INVALID;
            update_option(self::STATUS_OPTION, $status);
            return false;
        }
    }
    
    /**
     * Handle grace period for expired licenses
     */
    private function handle_grace_period() {
        $grace_period_days = 7;
        $expires_at = isset($this->license_data['expires_at']) ? $this->license_data['expires_at'] : null;
        
        if ($expires_at) {
            $expired_date = strtotime($expires_at);
            $grace_end = $expired_date + ($grace_period_days * DAY_IN_SECONDS);
            
            if (time() < $grace_end) {
                // Still in grace period
                return true;
            }
        }
        
        // Grace period expired
        update_option(self::STATUS_OPTION, self::STATUS_EXPIRED);
        return false;
    }
    
    /**
     * Check if license is active
     */
    public function is_active() {
        $status = get_option(self::STATUS_OPTION, self::STATUS_INVALID);
        return $status === self::STATUS_ACTIVE;
    }
    
    /**
     * Get license status
     */
    public function get_status() {
        return get_option(self::STATUS_OPTION, self::STATUS_INVALID);
    }
    
    /**
     * Get subscription tier
     */
    public function get_tier() {
        return isset($this->license_data['tier']) ? $this->license_data['tier'] : self::TIER_FREE;
    }
    
    /**
     * Check if feature is available in current tier
     */
    public function has_feature($feature) {
        $tier = $this->get_tier();
        
        $features = array(
            self::TIER_FREE => array('local_compression', 'basic_settings'),
            self::TIER_STARTER => array('local_compression', 'basic_settings', 'api_compression', 'analytics', 'restore'),
            self::TIER_PRO => array('local_compression', 'basic_settings', 'api_compression', 'analytics', 'restore', 'scheduler', 'presets', 'cli'),
            self::TIER_AGENCY => array('local_compression', 'basic_settings', 'api_compression', 'analytics', 'restore', 'scheduler', 'presets', 'cli', 'white_label', 'multisite')
        );
        
        return isset($features[$tier]) && in_array($feature, $features[$tier]);
    }
    
    /**
     * Get API quota information
     */
    public function get_quota() {
        return isset($this->license_data['quota']) ? $this->license_data['quota'] : array(
            'monthly_limit' => 0,
            'used' => 0,
            'reset_date' => null
        );
    }
    
    /**
     * Track API usage
     */
    public function track_usage($count = 1) {
        if (!$this->is_active()) {
            return false;
        }
        
        $response = wp_remote_post(self::API_ENDPOINT . '/usage', array(
            'body' => json_encode(array(
                'license_key' => $this->license_key,
                'domain' => home_url(),
                'count' => $count
            )),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 10
        ));
        
        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (isset($body['success']) && $body['success']) {
                // Update local quota data
                if (isset($body['quota'])) {
                    $this->license_data['quota'] = $body['quota'];
                    update_option(self::DATA_OPTION, $this->license_data);
                }
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Encrypt license key for storage
     */
    private function encrypt($data) {
        if (!extension_loaded('openssl')) {
            // Fallback to base64 if OpenSSL not available
            return base64_encode($data);
        }
        
        $key = $this->get_encryption_key();
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt license key
     */
    private function decrypt($data) {
        if (!extension_loaded('openssl')) {
            // Fallback if OpenSSL not available
            return base64_decode($data);
        }
        
        $key = $this->get_encryption_key();
        $data = base64_decode($data);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
    
    /**
     * Get encryption key from WordPress auth constants
     */
    private function get_encryption_key() {
        if (defined('AUTH_KEY')) {
            return substr(AUTH_KEY, 0, 32);
        }
        return 'wp_imgpressor_default_key_12345';
    }
    
    /**
     * Validate license key format
     */
    private function is_valid_format($license_key) {
        // Expected format: XXXX-XXXX-XXXX-XXXX (16 alphanumeric characters)
        return preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $license_key);
    }
    
    /**
     * Get license display data for admin
     */
    public function get_display_data() {
        return array(
            'is_active' => $this->is_active(),
            'status' => $this->get_status(),
            'tier' => $this->get_tier(),
            'expires_at' => isset($this->license_data['expires_at']) ? $this->license_data['expires_at'] : null,
            'quota' => $this->get_quota(),
            'masked_key' => $this->get_masked_key()
        );
    }
    
    /**
     * Get masked license key for display
     */
    private function get_masked_key() {
        if (empty($this->license_key)) {
            return '';
        }
        
        $parts = explode('-', $this->license_key);
        if (count($parts) === 4) {
            return $parts[0] . '-****-****-' . $parts[3];
        }
        
        return substr($this->license_key, 0, 4) . '************';
    }
}
