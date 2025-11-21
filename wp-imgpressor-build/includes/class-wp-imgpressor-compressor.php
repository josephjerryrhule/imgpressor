<?php
/**
 * Image compression functionality using PHP GD/Imagick
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Compressor {
    
    private $available_library = null;
    private $pending_metadata = array();
    
    public function __construct() {
        $this->detect_available_library();
    }
    
    /**
     * Detect which image library is available
     */
    private function detect_available_library() {
        if (extension_loaded('imagick') && class_exists('Imagick')) {
            $this->available_library = 'imagick';
        } elseif (extension_loaded('gd') && function_exists('gd_info')) {
            $this->available_library = 'gd';
        }
    }
    
    /**
     * Get the available image processing library
     */
    public function get_available_library() {
        return $this->available_library;
    }
    
    /**
     * Check if a specific format is supported
     */
    public function is_format_supported($format) {
        if (!$this->available_library) {
            return false;
        }
        
        if ($format === 'webp') {
            if ($this->available_library === 'imagick') {
                return in_array('WEBP', Imagick::queryFormats());
            } elseif ($this->available_library === 'gd') {
                return function_exists('imagewebp');
            }
        }
        
        if ($format === 'avif') {
            if ($this->available_library === 'imagick') {
                return in_array('AVIF', Imagick::queryFormats());
            } elseif ($this->available_library === 'gd') {
                return function_exists('imageavif') && PHP_VERSION_ID >= 80100;
            }
        }
        
        return false;
    }
    
    /**
     * Get supported formats
     */
    public function get_supported_formats() {
        $formats = array();
        
        if ($this->is_format_supported('webp')) {
            $formats['webp'] = 'WebP';
        }
        
        if ($this->is_format_supported('avif')) {
            $formats['avif'] = 'AVIF';
        }
        
        return $formats;
    }
    
    public function compress_on_upload($file, $attachment_data = array()) {
        // Only process images
        if (strpos($file['type'], 'image/') !== 0) {
            return $file;
        }
        
        // Skip if already compressed format
        if (strpos($file['type'], 'image/webp') !== false || strpos($file['type'], 'image/avif') !== false) {
            return $file;
        }
        
        // Skip SVG files
        if (strpos($file['type'], 'image/svg') !== false) {
            return $file;
        }
        
        $options = get_option('wp_imgpressor_settings');
        
        // Check if image library is available
        if (!$this->available_library) {
            return $file;
        }
        
        $result = $this->compress_image($file['file'], $options);
        
        if ($result['success']) {
            // Update file info
            $new_file = $result['output_path'];
            $old_size = filesize($file['file']);
            $new_size = filesize($new_file);
            
            // Store compression metadata
            $compression_data = array(
                'original_size' => $old_size,
                'compressed_size' => $new_size,
                'space_saved' => $old_size - $new_size,
                'reduction_percent' => (($old_size - $new_size) / $old_size) * 100,
                'format' => $options['format'],
                'quality' => $options['quality'],
                'compressed_file' => $new_file
            );
            
            // Replace or keep original based on settings
            if (!$options['preserve_original']) {
                unlink($file['file']);
                $file['file'] = $new_file;
                $file['type'] = 'image/' . $options['format'];
            }
            
            // Store metadata temporarily using the file path as key
            // This will be saved to post meta when add_attachment hook fires
            $this->pending_metadata[$new_file] = $compression_data;
            $file['wp_imgpressor_data'] = $compression_data;
        }
        
        return $file;
    }
    
    /**
     * Save compression metadata to attachment post meta
     * Called by add_attachment hook
     */
    public function save_compression_metadata($attachment_id) {
        $file_path = get_attached_file($attachment_id);
        
        // Check if we have pending metadata for this file
        if (isset($this->pending_metadata[$file_path])) {
            $data = $this->pending_metadata[$file_path];
            
            update_post_meta($attachment_id, '_wp_imgpressor_compressed', 1);
            update_post_meta($attachment_id, '_wp_imgpressor_original_size', $data['original_size']);
            update_post_meta($attachment_id, '_wp_imgpressor_compressed_size', $data['compressed_size']);
            update_post_meta($attachment_id, '_wp_imgpressor_space_saved', $data['space_saved']);
            update_post_meta($attachment_id, '_wp_imgpressor_reduction', $data['reduction_percent']);
            update_post_meta($attachment_id, '_wp_imgpressor_format', $data['format']);
            
            // Clean up
            unset($this->pending_metadata[$file_path]);
        }
    }
    
    public function compress_attachment($attachment_id) {
        $file_path = get_attached_file($attachment_id);
        
        if (!file_exists($file_path)) {
            return array('success' => false, 'message' => __('File not found', 'wp-imgpressor'));
        }
        
        $options = get_option('wp_imgpressor_settings');
        $result = $this->compress_image($file_path, $options);
        
        if ($result['success']) {
            $old_size = filesize($file_path);
            $new_size = filesize($result['output_path']);
            $space_saved = $old_size - $new_size;
            $reduction = (($old_size - $new_size) / $old_size) * 100;
            
            // Update attachment metadata
            update_post_meta($attachment_id, '_wp_imgpressor_compressed', 1);
            update_post_meta($attachment_id, '_wp_imgpressor_original_size', $old_size);
            update_post_meta($attachment_id, '_wp_imgpressor_compressed_size', $new_size);
            update_post_meta($attachment_id, '_wp_imgpressor_space_saved', $space_saved);
            update_post_meta($attachment_id, '_wp_imgpressor_reduction', $reduction);
            update_post_meta($attachment_id, '_wp_imgpressor_format', $options['format']);
            
            // Replace original if not preserving
            if (!$options['preserve_original']) {
                unlink($file_path);
                update_attached_file($attachment_id, $result['output_path']);
            }
            
            return array(
                'success' => true,
                'old_size' => $old_size,
                'new_size' => $new_size,
                'space_saved' => $space_saved,
                'reduction' => $reduction
            );
        }
        
        return $result;
    }
    
    private function compress_image($input_path, $options) {
        $format = $options['format'];
        $quality = $options['quality'];
        
        // Check for remote processing
        if (isset($options['enable_remote']) && $options['enable_remote']) {
            $api = new WP_ImgPressor_API();
            if ($api->is_configured()) {
                $result = $api->compress_image($input_path, $options);
                
                if ($result['success']) {
                    return $result;
                }
                
                // Fallback to local processing if API fails
                // Log the error or add a notice (optional)
                // Proceed to local processing below...
            }
        }
        
        // Generate output path
        $path_info = pathinfo($input_path);
        $output_path = $path_info['dirname'] . '/' . $path_info['filename'] . '.' . $format;
        
        // Use available library for compression
        if ($this->available_library === 'imagick') {
            return $this->compress_with_imagick($input_path, $output_path, $format, $quality);
        } elseif ($this->available_library === 'gd') {
            return $this->compress_with_gd($input_path, $output_path, $format, $quality);
        }
        
        return array(
            'success' => false,
            'message' => __('No image processing library available', 'wp-imgpressor')
        );
    }
    
    /**
     * Compress image using Imagick
     */
    private function compress_with_imagick($input_path, $output_path, $format, $quality) {
        try {
            $imagick = new Imagick($input_path);
            
            // Get options for optimization
            $options = get_option('wp_imgpressor_settings');
            $max_width = isset($options['max_width']) ? intval($options['max_width']) : 2560;
            $max_height = isset($options['max_height']) ? intval($options['max_height']) : 2560;
            $speed = isset($options['compression_speed']) ? $options['compression_speed'] : 'balanced';
            
            // Resize if image is too large (speeds up compression significantly)
            $width = $imagick->getImageWidth();
            $height = $imagick->getImageHeight();
            
            if ($width > $max_width || $height > $max_height) {
                $imagick->resizeImage($max_width, $max_height, Imagick::FILTER_LANCZOS, 1, true);
            }
            
            // Convert to target format
            if ($format === 'webp') {
                $imagick->setImageFormat('WEBP');
                
                // Adjust compression method based on speed setting
                switch ($speed) {
                    case 'fast':
                        $imagick->setOption('webp:method', '0'); // Fastest
                        $imagick->setOption('webp:low-memory', 'true');
                        break;
                    case 'quality':
                        $imagick->setOption('webp:method', '6'); // Best quality
                        break;
                    default: // balanced
                        $imagick->setOption('webp:method', '4'); // Balanced
                }
                
                $imagick->setImageCompressionQuality($quality);
            } elseif ($format === 'avif') {
                // Check if AVIF is supported
                $formats = Imagick::queryFormats('AVIF');
                if (empty($formats)) {
                    return array(
                        'success' => false,
                        'message' => __('AVIF format not supported by your ImageMagick installation', 'wp-imgpressor')
                    );
                }
                $imagick->setImageFormat('AVIF');
                
                // AVIF compression speed options
                switch ($speed) {
                    case 'fast':
                        $imagick->setOption('heic:speed', '8'); // Fastest
                        break;
                    case 'quality':
                        $imagick->setOption('heic:speed', '4'); // Best quality
                        break;
                    default: // balanced
                        $imagick->setOption('heic:speed', '6'); // Balanced
                }
                
                $imagick->setImageCompressionQuality($quality);
            }
            
            // Remove metadata to reduce file size
            $imagick->stripImage();
            
            // Write the compressed image
            $imagick->writeImage($output_path);
            $imagick->clear();
            $imagick->destroy();
            
            if (file_exists($output_path)) {
                return array(
                    'success' => true,
                    'output_path' => $output_path,
                    'message' => __('Image compressed successfully', 'wp-imgpressor')
                );
            }
            
            return array(
                'success' => false,
                'message' => __('Failed to write compressed image', 'wp-imgpressor')
            );
            
        } catch (Exception $e) {
            return array(
                'success' => false,
                'message' => __('Compression failed', 'wp-imgpressor'),
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Compress image using GD
     */
    private function compress_with_gd($input_path, $output_path, $format, $quality) {
        // Get image info
        $image_info = getimagesize($input_path);
        if (!$image_info) {
            return array(
                'success' => false,
                'message' => __('Failed to read image', 'wp-imgpressor')
            );
        }
        
        $mime_type = $image_info['mime'];
        $width = $image_info[0];
        $height = $image_info[1];
        
        // Get options for optimization
        $options = get_option('wp_imgpressor_settings');
        $max_width = isset($options['max_width']) ? intval($options['max_width']) : 2560;
        $max_height = isset($options['max_height']) ? intval($options['max_height']) : 2560;
        
        // Create image resource from source
        switch ($mime_type) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($input_path);
                break;
            case 'image/png':
                $image = imagecreatefrompng($input_path);
                // Preserve transparency
                imagealphablending($image, false);
                imagesavealpha($image, true);
                break;
            case 'image/gif':
                $image = imagecreatefromgif($input_path);
                break;
            case 'image/webp':
                $image = imagecreatefromwebp($input_path);
                break;
            default:
                return array(
                    'success' => false,
                    'message' => __('Unsupported image format', 'wp-imgpressor')
                );
        }
        
        if (!$image) {
            return array(
                'success' => false,
                'message' => __('Failed to create image resource', 'wp-imgpressor')
            );
        }
        
        // Resize if image is too large (speeds up compression)
        if ($width > $max_width || $height > $max_height) {
            $ratio = min($max_width / $width, $max_height / $height);
            $new_width = round($width * $ratio);
            $new_height = round($height * $ratio);
            
            $resized = imagecreatetruecolor($new_width, $new_height);
            
            // Preserve transparency for PNG/WebP
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $transparent);
            
            // Resize with high quality
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
            imagedestroy($image);
            $image = $resized;
        }
        
        // Convert to target format
        $success = false;
        if ($format === 'webp') {
            // Check if WebP is supported
            if (!function_exists('imagewebp')) {
                imagedestroy($image);
                return array(
                    'success' => false,
                    'message' => __('WebP format not supported by your PHP GD installation', 'wp-imgpressor')
                );
            }
            $success = imagewebp($image, $output_path, $quality);
        } elseif ($format === 'avif') {
            // Check if AVIF is supported (PHP 8.1+)
            if (!function_exists('imageavif')) {
                imagedestroy($image);
                return array(
                    'success' => false,
                    'message' => __('AVIF format requires PHP 8.1+ with GD compiled with AVIF support', 'wp-imgpressor')
                );
            }
            $success = imageavif($image, $output_path, $quality);
        }
        
        imagedestroy($image);
        
        if ($success && file_exists($output_path)) {
            return array(
                'success' => true,
                'output_path' => $output_path,
                'message' => __('Image compressed successfully', 'wp-imgpressor')
            );
        }
        
        return array(
            'success' => false,
            'message' => __('Failed to compress image', 'wp-imgpressor')
        );
    }
    
    public function test_compression() {
        $options = get_option('wp_imgpressor_settings');
        $format = $options['format'];
        
        if (!$this->available_library) {
            return array(
                'success' => false,
                'message' => __('No image processing library available. Please ensure GD or Imagick extension is installed in PHP.', 'wp-imgpressor')
            );
        }
        
        $messages = array();
        $warnings = array();
        
        // Check library capabilities
        if ($this->available_library === 'imagick') {
            $imagick_version = Imagick::getVersion();
            $messages[] = 'Using ImageMagick: ' . $imagick_version['versionString'];
            
            // Check format support
            $webp_support = in_array('WEBP', Imagick::queryFormats());
            $avif_support = in_array('AVIF', Imagick::queryFormats());
            
            $messages[] = 'WebP support: ' . ($webp_support ? 'Yes' : 'No');
            $messages[] = 'AVIF support: ' . ($avif_support ? 'Yes' : 'No');
            
            if ($format === 'webp' && !$webp_support) {
                $warnings[] = 'WebP is selected but not supported. Please select a different format or update ImageMagick.';
            }
            if ($format === 'avif' && !$avif_support) {
                $warnings[] = 'AVIF is selected but not supported. Please select WebP or update ImageMagick.';
            }
            
        } elseif ($this->available_library === 'gd') {
            $gd_info = gd_info();
            $messages[] = 'Using GD Library version: ' . $gd_info['GD Version'];
            
            // Check format support
            $webp_support = function_exists('imagewebp');
            $avif_support = function_exists('imageavif');
            
            $messages[] = 'WebP support: ' . ($webp_support ? 'Yes' : 'No');
            $messages[] = 'AVIF support: ' . ($avif_support ? 'Yes (requires PHP 8.1+)' : 'No');
            
            if ($format === 'webp' && !$webp_support) {
                $warnings[] = 'WebP is selected but not supported. Please update PHP or use ImageMagick.';
            }
            if ($format === 'avif' && !$avif_support) {
                $warnings[] = 'AVIF is selected but not supported. Requires PHP 8.1+ with GD compiled with AVIF support.';
            }
        }
        
        $success = empty($warnings);
        $message = implode('<br>', $messages);
        if (!empty($warnings)) {
            $message .= '<br><strong>Warnings:</strong><br>' . implode('<br>', $warnings);
        }
        
        return array(
            'success' => $success,
            'message' => $success ? 
                __('Configuration test passed! ', 'wp-imgpressor') . $message :
                __('Configuration issues detected: ', 'wp-imgpressor') . $message,
            'library' => $this->available_library,
            'details' => $messages
        );
    }
}
