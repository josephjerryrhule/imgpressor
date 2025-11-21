(function ($) {
  "use strict";

  $(document).ready(function () {
    // Quality slider value display
    $(".quality-slider").on("input", function () {
      $(this).next(".quality-value").text($(this).val());
    });

    // Test compression button
    $("#test-compression").on("click", function () {
      const button = $(this);
      const resultDiv = $("#test-result");

      button.prop("disabled", true).text("Testing...");
      resultDiv.removeClass("success error").hide();

      $.ajax({
        url: wpImgpressor.ajax_url,
        type: "POST",
        data: {
          action: "wp_imgpressor_test_compression",
          nonce: wpImgpressor.nonce,
        },
        success: function (response) {
          button.prop("disabled", false).text("Run Test");

          if (response.success) {
            resultDiv
              .addClass("success")
              .html("<strong>Success!</strong> " + response.data.message)
              .show();

            if (response.data.node_version) {
              resultDiv.append(
                "<br><small>Node.js version: " +
                  response.data.node_version +
                  "</small>"
              );
            }
          } else {
            resultDiv
              .addClass("error")
              .html("<strong>Error:</strong> " + response.data.message)
              .show();
          }
        },
        error: function (xhr, status, error) {
          button.prop("disabled", false).text("Run Test");
          resultDiv
            .addClass("error")
            .html(
              "<strong>Error:</strong> Failed to run test. Please check your server logs."
            )
            .show();
        },
      });
    });

    // Bulk compression progress tracking
    if (typeof wp !== "undefined" && wp.media) {
      const originalBulkSelect =
        wp.media.view.AttachmentsBrowser.prototype.bulkSelect;

      wp.media.view.AttachmentsBrowser.prototype.bulkSelect = function () {
        originalBulkSelect.apply(this, arguments);

        // Add custom bulk action handler
        const toolbar = this.toolbar.get("compress");
        if (toolbar) {
          toolbar.on("click", function (e) {
            e.preventDefault();
            compressBulkAttachments();
          });
        }
      };
    }

    function compressBulkAttachments() {
      const selectedIds = [];
      $(".attachments .attachment.selected").each(function () {
        selectedIds.push($(this).data("id"));
      });

      if (selectedIds.length === 0) {
        alert("Please select images to compress.");
        return;
      }

      const progressHtml = `
                <div class="wp-imgpressor-progress">
                    <div class="wp-imgpressor-progress-bar" style="width: 0%"></div>
                    <div class="wp-imgpressor-progress-text">Compressing 0 of ${selectedIds.length} images...</div>
                </div>
            `;

      $(".media-toolbar").after(progressHtml);

      let completed = 0;
      const total = selectedIds.length;

      function compressNext(index) {
        if (index >= selectedIds.length) {
          $(".wp-imgpressor-progress-text").text(
            `Completed! Compressed ${completed} of ${total} images.`
          );
          setTimeout(function () {
            $(".wp-imgpressor-progress").fadeOut(function () {
              $(this).remove();
              location.reload();
            });
          }, 2000);
          return;
        }

        const attachmentId = selectedIds[index];

        $.ajax({
          url: wpImgpressor.ajax_url,
          type: "POST",
          data: {
            action: "wp_imgpressor_bulk_compress",
            nonce: wpImgpressor.nonce,
            attachment_ids: [attachmentId],
          },
          success: function (response) {
            if (response.success) {
              completed++;
            }

            const progress = ((index + 1) / total) * 100;
            $(".wp-imgpressor-progress-bar").css("width", progress + "%");
            $(".wp-imgpressor-progress-text").text(
              `Compressing ${index + 1} of ${total} images...`
            );

            compressNext(index + 1);
          },
          error: function () {
            const progress = ((index + 1) / total) * 100;
            $(".wp-imgpressor-progress-bar").css("width", progress + "%");
            $(".wp-imgpressor-progress-text").text(
              `Compressing ${
                index + 1
              } of ${total} images... (error on image ${attachmentId})`
            );

            compressNext(index + 1);
          },
        });
      }

      compressNext(0);
    }

    // Show compression notice if present
    const urlParams = new URLSearchParams(window.location.search);
    const compressed = urlParams.get("wp_imgpressor_compressed");

    if (compressed) {
      const notice = $(
        '<div class="notice notice-success is-dismissible"><p><strong>WP ImgPressor:</strong> Successfully compressed ' +
          compressed +
          " image(s).</p></div>"
      );
      $(".wrap > h1").after(notice);

      // Make notice dismissible
      notice.on("click", ".notice-dismiss", function () {
        notice.fadeOut();
      });
    }

    // Bulk optimization handler
    $("#start-bulk-optimization").on("click", function () {
      const button = $(this);
      const spinner = button.next(".spinner");
      const progressDiv = $("#bulk-optimization-progress");
      const logDiv = $("#bulk-optimization-log");

      if (
        confirm(
          "This will compress all uncompressed images in your Media Library. Continue?"
        )
      ) {
        button.prop("disabled", true);
        spinner.addClass("is-active");
        progressDiv.show();
        logDiv.show().html("<div>Starting bulk optimization...</div>");

        // Start bulk process
        $.ajax({
          url: wpImgpressor.ajax_url,
          type: "POST",
          data: {
            action: "wp_imgpressor_start_bulk",
            nonce: wpImgpressor.nonce,
          },
          success: function (response) {
            if (response.success) {
              const totalImages = response.data.total;
              logDiv.append(
                "<div>Found " + totalImages + " images to compress.</div>"
              );

              if (totalImages > 0) {
                processBulkImages(response.data.images, 0, totalImages);
              } else {
                logDiv.append("<div>No images to compress!</div>");
                button.prop("disabled", false);
                spinner.removeClass("is-active");
              }
            } else {
              logDiv.append(
                '<div style="color: red;">Error: ' +
                  response.data.message +
                  "</div>"
              );
              button.prop("disabled", false);
              spinner.removeClass("is-active");
            }
          },
          error: function () {
            logDiv.append(
              '<div style="color: red;">Failed to start bulk optimization.</div>'
            );
            button.prop("disabled", false);
            spinner.removeClass("is-active");
          },
        });
      }
    });

    function processBulkImages(images, index, total) {
      if (index >= images.length) {
        $("#bulk-optimization-log").append(
          '<div style="color: green; font-weight: bold;">Bulk optimization complete!</div>'
        );
        $("#start-bulk-optimization")
          .prop("disabled", false)
          .next(".spinner")
          .removeClass("is-active");

        // Show success toast
        const toast = $(
          '<div class="notice notice-success is-dismissible" style="position: fixed; top: 32px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">' +
            "<p><strong>WP ImgPressor:</strong> Bulk optimization completed! Successfully processed " +
            total +
            " images. Refreshing statistics...</p>" +
            "</div>"
        );
        $("body").append(toast);

        // Refresh page after 2 seconds to update statistics
        setTimeout(function () {
          location.reload();
        }, 2000);

        return;
      }

      const imageId = images[index];
      const progress = Math.round(((index + 1) / total) * 100);

      $(".wp-imgpressor-progress-bar").css("width", progress + "%");
      $(".progress-text").text(
        "Processing image " + (index + 1) + " of " + total + "..."
      );

      $.ajax({
        url: wpImgpressor.ajax_url,
        type: "POST",
        data: {
          action: "wp_imgpressor_bulk_compress",
          nonce: wpImgpressor.nonce,
          attachment_ids: [imageId],
        },
        success: function (response) {
          if (response.success) {
            $("#bulk-optimization-log").append(
              '<div style="color: green;">✓ Image #' +
                imageId +
                " compressed successfully.</div>"
            );
          } else {
            $("#bulk-optimization-log").append(
              '<div style="color: orange;">⚠ Image #' +
                imageId +
                ": " +
                (response.data.message || "Failed") +
                "</div>"
            );
          }

          // Auto-scroll log
          $("#bulk-optimization-log").scrollTop(
            $("#bulk-optimization-log")[0].scrollHeight
          );

          // Process next image
          setTimeout(function () {
            processBulkImages(images, index + 1, total);
          }, 500);
        },
        error: function () {
          $("#bulk-optimization-log").append(
            '<div style="color: red;">✗ Image #' +
              imageId +
              ": Server error.</div>"
          );
          $("#bulk-optimization-log").scrollTop(
            $("#bulk-optimization-log")[0].scrollHeight
          );

          setTimeout(function () {
            processBulkImages(images, index + 1, total);
          }, 500);
        },
      });
    }

    // Animation preview handler
    function playAnimation(animationType) {
      const previewImage = $(".preview-image");

      // Reset
      previewImage.removeClass("lazy-fade lazy-blur lazy-skeleton").css({
        opacity: "0",
        filter: "blur(20px)",
        transform: "scale(1.1)",
      });

      // Apply animation class
      setTimeout(function () {
        previewImage.addClass("lazy-" + animationType);

        if (animationType === "fade") {
          previewImage.css({
            opacity: "1",
            transition: "opacity 0.5s ease-in-out",
          });
        } else if (animationType === "blur") {
          previewImage.css({
            opacity: "1",
            filter: "blur(0)",
            transform: "scale(1)",
            transition: "all 0.8s ease-out",
          });
        } else if (animationType === "skeleton") {
          previewImage.css({
            opacity: "1",
            transition: "opacity 0.3s ease-in-out",
            animation: "pulse 1.5s ease-in-out",
          });
        }
      }, 100);
    }

    // Initial animation on page load
    if ($("#lazy_load_animation").length) {
      playAnimation($("#lazy_load_animation").val());
    }

    // Animation change handler
    $("#lazy_load_animation").on("change", function () {
      playAnimation($(this).val());
    });

    // Replay button handler
    $("#replay-animation").on("click", function (e) {
      e.preventDefault();
      playAnimation($("#lazy_load_animation").val());
    });
  });
})(jQuery);
