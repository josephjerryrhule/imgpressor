<?php
/**
 * API Client for remote image processing
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_API {
    
    private $api_url;
    private $api_key;
    
    public function __construct() {
        $options = get_option('wp_imgpressor_settings');
        $this->api_url = isset($options['api_url']) ? rtrim($options['api_url'], '/') : '';
        $this->api_key = isset($options['api_key']) ? $options['api_key'] : '';
    }
    
    /**
     * Check if remote processing is configured and available
     */
    public function is_configured() {
        return !empty($this->api_url);
    }
    
    /**
     * Test connection to the API
     */
    public function test_connection() {
        if (!$this->is_configured()) {
            return array(
                'success' => false,
                'message' => __('API URL is not configured', 'wp-imgpressor')
            );
        }
        
        $response = wp_remote_get($this->api_url . '/health', array(
            'timeout' => 10,
            'headers' => $this->get_headers()
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            return array(
                'success' => false,
                'message' => sprintf(__('API returned error code: %d', 'wp-imgpressor'), $code)
            );
        }
        
        return array(
            'success' => true,
            'message' => __('Connection successful', 'wp-imgpressor')
        );
    }
    
    /**
     * Compress image via remote API
     */
    public function compress_image($file_path, $options) {
        if (!$this->is_configured()) {
            return array('success' => false, 'message' => 'API not configured');
        }
        
        if (!file_exists($file_path)) {
            return array('success' => false, 'message' => 'File not found');
        }
        
        // Prepare the file
        $file_contents = file_get_contents($file_path);
        $filename = basename($file_path);
        $mime_type = mime_content_type($file_path);
        
        // Prepare the boundary
        $boundary = wp_generate_password(24);
        
        // Build the body
        $body = '';
        
        // Add file
        $body .= "--" . $boundary . "\r\n";
        $body .= 'Content-Disposition: form-data; name="images"; filename="' . $filename . '"' . "\r\n";
        $body .= 'Content-Type: ' . $mime_type . "\r\n\r\n";
        $body .= $file_contents . "\r\n";
        
        // Add options
        foreach ($options as $key => $value) {
            $body .= "--" . $boundary . "\r\n";
            $body .= 'Content-Disposition: form-data; name="' . $key . '"' . "\r\n\r\n";
            $body .= $value . "\r\n";
        }
        
        $body .= "--" . $boundary . "--\r\n";
        
        // Send request
        $response = wp_remote_post($this->api_url . '/process', array(
            'method' => 'POST',
            'timeout' => 30, // Allow more time for processing
            'headers' => array_merge(
                $this->get_headers(),
                array('Content-Type' => 'multipart/form-data; boundary=' . $boundary)
            ),
            'body' => $body
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            $body = wp_remote_retrieve_body($response);
            $error = json_decode($body, true);
            return array(
                'success' => false,
                'message' => isset($error['error']) ? $error['error'] : 'API Error ' . $code
            );
        }
        
        // Save the processed image
        $image_data = wp_remote_retrieve_body($response);
        
        // Determine output path (same directory, new extension)
        $path_info = pathinfo($file_path);
        $format = isset($options['format']) ? $options['format'] : 'webp';
        $output_path = $path_info['dirname'] . '/' . $path_info['filename'] . '.' . $format;
        
        if (file_put_contents($output_path, $image_data) === false) {
            return array(
                'success' => false,
                'message' => __('Failed to save processed image', 'wp-imgpressor')
            );
        }
        
        return array(
            'success' => true,
            'output_path' => $output_path,
            'message' => __('Image processed remotely', 'wp-imgpressor')
        );
    }
    
    private function get_headers() {
        $headers = array();
        if (!empty($this->api_key)) {
            $headers['Authorization'] = 'Bearer ' . $this->api_key;
        }
        return $headers;
    }
}
