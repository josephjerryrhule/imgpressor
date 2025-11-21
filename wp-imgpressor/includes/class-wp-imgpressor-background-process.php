<?php
/**
 * Background Process for Bulk Optimization
 *
 * @package WP_ImgPressor
 */

class WP_ImgPressor_Background_Process {

    const OPTION_QUEUE = 'wp_imgpressor_queue';
    const OPTION_STATUS = 'wp_imgpressor_bg_status';
    const CRON_HOOK = 'wp_imgpressor_process_queue';
    const BATCH_SIZE = 5;

    public function __construct() {
        add_filter('cron_schedules', array($this, 'add_cron_interval'));
        add_action($this::CRON_HOOK, array($this, 'process_queue'));
    }

    /**
     * Add custom cron interval
     */
    public function add_cron_interval($schedules) {
        $schedules['every_minute'] = array(
            'interval' => 60,
            'display'  => __('Every Minute', 'wp-imgpressor')
        );
        return $schedules;
    }

    /**
     * Start the background process
     * Finds all uncompressed images and adds them to the queue
     */
    public function start_process() {
        // Get all attachments that are images
        $args = array(
            'post_type'      => 'attachment',
            'post_mime_type' => 'image',
            'post_status'    => 'inherit',
            'posts_per_page' => -1,
            'fields'         => 'ids',
            'meta_query'     => array(
                array(
                    'key'     => '_wp_imgpressor_compressed',
                    'compare' => 'NOT EXISTS'
                )
            )
        );

        $query = new WP_Query($args);
        $ids = $query->posts;

        if (empty($ids)) {
            return array('success' => false, 'message' => __('No images found to compress.', 'wp-imgpressor'));
        }

        // Save queue
        update_option($this::OPTION_QUEUE, $ids, false);
        
        // Set status
        update_option($this::OPTION_STATUS, array(
            'active' => true,
            'total' => count($ids),
            'processed' => 0,
            'start_time' => time()
        ), false);

        // Schedule cron if not already scheduled
        if (!wp_next_scheduled($this::CRON_HOOK)) {
            wp_schedule_event(time(), 'every_minute', $this::CRON_HOOK);
            // Also spawn a non-blocking loop immediately for the first batch
            $this->spawn_cron();
        }

        return array(
            'success' => true,
            'total' => count($ids),
            'images' => $ids
        );
    }

    /**
     * Process a batch of images from the queue
     */
    public function process_queue() {
        $queue = get_option($this::OPTION_QUEUE, array());
        $status = get_option($this::OPTION_STATUS, array());

        if (empty($queue)) {
            $this->complete_process();
            return;
        }

        // Get batch
        $batch = array_splice($queue, 0, $this::BATCH_SIZE);
        
        // Initialize compressor
        if (!class_exists('WP_ImgPressor_Compressor')) {
            require_once WP_IMGPRESSOR_PLUGIN_DIR . 'includes/class-wp-imgpressor-compressor.php';
        }
        $compressor = new WP_ImgPressor_Compressor();

        foreach ($batch as $id) {
            $compressor->compress_attachment($id);
            if (isset($status['processed'])) {
                $status['processed']++;
            }
        }

        // Update queue and status
        update_option($this::OPTION_QUEUE, $queue, false);
        update_option($this::OPTION_STATUS, $status, false);

        // If queue is empty, finish
        if (empty($queue)) {
            $this->complete_process();
        } else {
            // Keep the cron running
             if (!wp_next_scheduled($this::CRON_HOOK)) {
                wp_schedule_event(time(), 'every_minute', $this::CRON_HOOK);
            }
        }
    }

    /**
     * Complete the process
     */
    private function complete_process() {
        $status = get_option($this::OPTION_STATUS, array());
        $status['active'] = false;
        $status['completed'] = true; // Flag for UI to show toast
        $status['completed_time'] = time();
        
        update_option($this::OPTION_STATUS, $status, false);
        wp_clear_scheduled_hook($this::CRON_HOOK);
    }
    
    /**
     * Trigger a non-blocking request to run the cron immediately
     */
    private function spawn_cron() {
        $url = site_url('wp-cron.php');
        $args = array(
            'blocking' => false,
            'sslverify' => false,
            'timeout' => 0.01,
        );
        wp_remote_post($url, $args);
    }

    /**
     * Get current status
     */
    public function get_status() {
        return get_option($this::OPTION_STATUS, array('active' => false));
    }
    
    /**
     * Clear completion flag (after toast is shown)
     */
    public function clear_completion_flag() {
        $status = get_option($this::OPTION_STATUS, array());
        if (isset($status['completed'])) {
            unset($status['completed']);
            update_option($this::OPTION_STATUS, $status, false);
        }
    }
}
