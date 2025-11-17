<?php
/**
 * Image compression functionality using PHP GD/Imagick
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Compressor {
    
    private $available_library = null;
    
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
                'quality' => $options['quality']
            );
            
            // Replace or keep original based on settings
            if (!$options['preserve_original']) {
                unlink($file['file']);
                $file['file'] = $new_file;
                $file['type'] = 'image/' . $options['format'];
            }
            
            // Store metadata for later use (will be saved to post meta after attachment is created)
            $file['wp_imgpressor_data'] = $compression_data;
        }
        
        return $file;
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
            
            // Convert to target format
            if ($format === 'webp') {
                $imagick->setImageFormat('WEBP');
                $imagick->setOption('webp:method', '6'); // Best quality
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
