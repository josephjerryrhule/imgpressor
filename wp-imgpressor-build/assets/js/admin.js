(function($) {
    'use strict';

    $(document).ready(function() {
        
        // Quality slider value display
        $('.quality-slider').on('input', function() {
            $(this).next('.quality-value').text($(this).val());
        });
        
        // Test compression button
        $('#test-compression').on('click', function() {
            const button = $(this);
            const resultDiv = $('#test-result');
            
            button.prop('disabled', true).text('Testing...');
            resultDiv.removeClass('success error').hide();
            
            $.ajax({
                url: wpImgpressor.ajax_url,
                type: 'POST',
                data: {
                    action: 'wp_imgpressor_test_compression',
                    nonce: wpImgpressor.nonce
                },
                success: function(response) {
                    button.prop('disabled', false).text('Run Test');
                    
                    if (response.success) {
                        resultDiv
                            .addClass('success')
                            .html('<strong>Success!</strong> ' + response.data.message)
                            .show();
                        
                        if (response.data.node_version) {
                            resultDiv.append('<br><small>Node.js version: ' + response.data.node_version + '</small>');
                        }
                    } else {
                        resultDiv
                            .addClass('error')
                            .html('<strong>Error:</strong> ' + response.data.message)
                            .show();
                    }
                },
                error: function(xhr, status, error) {
                    button.prop('disabled', false).text('Run Test');
                    resultDiv
                        .addClass('error')
                        .html('<strong>Error:</strong> Failed to run test. Please check your server logs.')
                        .show();
                }
            });
        });
        
        // Bulk compression progress tracking
        if (typeof wp !== 'undefined' && wp.media) {
            const originalBulkSelect = wp.media.view.AttachmentsBrowser.prototype.bulkSelect;
            
            wp.media.view.AttachmentsBrowser.prototype.bulkSelect = function() {
                originalBulkSelect.apply(this, arguments);
                
                // Add custom bulk action handler
                const toolbar = this.toolbar.get('compress');
                if (toolbar) {
                    toolbar.on('click', function(e) {
                        e.preventDefault();
                        compressBulkAttachments();
                    });
                }
            };
        }
        
        function compressBulkAttachments() {
            const selectedIds = [];
            $('.attachments .attachment.selected').each(function() {
                selectedIds.push($(this).data('id'));
            });
            
            if (selectedIds.length === 0) {
                alert('Please select images to compress.');
                return;
            }
            
            const progressHtml = `
                <div class="wp-imgpressor-progress">
                    <div class="wp-imgpressor-progress-bar" style="width: 0%"></div>
                    <div class="wp-imgpressor-progress-text">Compressing 0 of ${selectedIds.length} images...</div>
                </div>
            `;
            
            $('.media-toolbar').after(progressHtml);
            
            let completed = 0;
            const total = selectedIds.length;
            
            function compressNext(index) {
                if (index >= selectedIds.length) {
                    $('.wp-imgpressor-progress-text').text(`Completed! Compressed ${completed} of ${total} images.`);
                    setTimeout(function() {
                        $('.wp-imgpressor-progress').fadeOut(function() {
                            $(this).remove();
                            location.reload();
                        });
                    }, 2000);
                    return;
                }
                
                const attachmentId = selectedIds[index];
                
                $.ajax({
                    url: wpImgpressor.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'wp_imgpressor_bulk_compress',
                        nonce: wpImgpressor.nonce,
                        attachment_ids: [attachmentId]
                    },
                    success: function(response) {
                        if (response.success) {
                            completed++;
                        }
                        
                        const progress = ((index + 1) / total) * 100;
                        $('.wp-imgpressor-progress-bar').css('width', progress + '%');
                        $('.wp-imgpressor-progress-text').text(`Compressing ${index + 1} of ${total} images...`);
                        
                        compressNext(index + 1);
                    },
                    error: function() {
                        const progress = ((index + 1) / total) * 100;
                        $('.wp-imgpressor-progress-bar').css('width', progress + '%');
                        $('.wp-imgpressor-progress-text').text(`Compressing ${index + 1} of ${total} images... (error on image ${attachmentId})`);
                        
                        compressNext(index + 1);
                    }
                });
            }
            
            compressNext(0);
        }
        
        // Show compression notice if present
        const urlParams = new URLSearchParams(window.location.search);
        const compressed = urlParams.get('wp_imgpressor_compressed');
        
        if (compressed) {
            const notice = $('<div class="notice notice-success is-dismissible"><p><strong>WP ImgPressor:</strong> Successfully compressed ' + compressed + ' image(s).</p></div>');
            $('.wrap > h1').after(notice);
            
            // Make notice dismissible
            notice.on('click', '.notice-dismiss', function() {
                notice.fadeOut();
            });
        }
    });

})(jQuery);
