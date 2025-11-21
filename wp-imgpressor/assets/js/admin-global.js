jQuery(document).ready(function ($) {
  // Check status every 5 seconds if we think a job might be running or completed

  function checkStatus() {
    if (!window.wpImgPressorGlobal || !window.wpImgPressorGlobal.nonce) {
      return;
    }

    $.post(
      ajaxurl,
      {
        action: "wp_imgpressor_check_status",
        nonce: wpImgPressorGlobal.nonce,
      },
      function (response) {
        if (response.success) {
          const status = response.data;

          if (status.active) {
            // Job running
            // Update button text if on settings page
            const btn = $("#wp-imgpressor-start-bulk");
            if (btn.length) {
              btn
                .prop("disabled", true)
                .text(
                  "Optimization Running (" +
                    status.processed +
                    "/" +
                    status.total +
                    ")..."
                );
            }

            // Keep polling
            setTimeout(checkStatus, 5000);
          } else if (status.completed) {
            // Job finished! Show toast
            showToast(
              "✅ Bulk Optimization Complete! " +
                status.total +
                " images processed."
            );

            // Reset button
            const btn = $("#wp-imgpressor-start-bulk");
            if (btn.length) {
              btn.prop("disabled", false).text("Start Bulk Optimization");
            }

            // Clear the flag so we don't show it again
            $.post(ajaxurl, {
              action: "wp_imgpressor_clear_status",
              nonce: wpImgPressorGlobal.nonce,
            });
          }
        }
      }
    );
  }

  // Start polling on load
  checkStatus();

  function showToast(message) {
    // Create toast element
    const toast = $('<div class="wp-imgpressor-toast">' + message + "</div>");
    $("body").append(toast);

    // Animate in
    setTimeout(function () {
      toast.addClass("show");
    }, 100);

    // Remove after 5 seconds
    setTimeout(function () {
      toast.removeClass("show");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 5000);
  }

  // Handle Start Button Click (on settings page)
  $("#wp-imgpressor-start-bulk").on("click", function (e) {
    e.preventDefault();
    const btn = $(this);
    btn.prop("disabled", true).text("Starting...");

    $.post(
      ajaxurl,
      {
        action: "wp_imgpressor_start_bulk",
        nonce: wpImgPressorGlobal.nonce,
      },
      function (response) {
        if (response.success) {
          showToast("🚀 Background optimization started!");
          btn.text("Optimization Running...");
          checkStatus(); // Start polling immediately
        } else {
          alert(response.data.message);
          btn.prop("disabled", false).text("Start Bulk Optimization");
        }
      }
    );
  });
});
