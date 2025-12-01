document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = document.querySelectorAll("img.wp-imgpressor-lazy");

  // Function to get computed background image
  function getBackgroundImage(element) {
    const computed = window.getComputedStyle(element);
    const bgImage = computed.backgroundImage;
    if (bgImage && bgImage !== "none") {
      return bgImage;
    }
    return null;
  }

  // Find all elements with background images (Elementor sections, divs, etc.)
  function findBackgroundElements() {
    const elements = [];
    // Common selectors for Elementor and other page builders
    const selectors = [
      '.elementor-background-overlay',
      '.elementor-column-wrap',
      '.elementor-widget-wrap',
      '.elementor-section',
      '.elementor-container',
      '[data-settings*="background"]',
      '.wp-imgpressor-bg-lazy', // Our custom class
      '[style*="background-image"]' // Inline styles
    ];

    selectors.forEach(function(selector) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(function(el) {
          const bgImage = getBackgroundImage(el);
          if (bgImage && bgImage !== "none" && !el.classList.contains('wp-imgpressor-bg-loaded')) {
            // Check if already processed
            if (!el.hasAttribute('data-bg-observed')) {
              el.setAttribute('data-bg-observed', 'true');
              elements.push(el);
            }
          }
        });
      } catch(e) {
        // Selector might not be valid, skip
      }
    });

    return elements;
  }

  if ("IntersectionObserver" in window) {
    // Image observer
    const imageObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const image = entry.target;

            // Load image
            if (image.dataset.src) {
              image.src = image.dataset.src;
            }
            if (image.dataset.srcset) {
              image.srcset = image.dataset.srcset;
            }

            // When image finishes loading, remove placeholder class
            image.onload = function () {
              image.classList.remove("wp-imgpressor-lazy");
              image.classList.add("wp-imgpressor-loaded");
            };

            // Stop observing
            observer.unobserve(image);
          }
        });
      },
      {
        rootMargin: "50px 0px", // Start loading 50px before viewport
        threshold: 0.01,
      }
    );

    lazyImages.forEach(function (image) {
      imageObserver.observe(image);
    });

    // Background image observer - observes elements not yet in viewport
    const bgObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const element = entry.target;

            // For elements with data-bg-src (inline style replacements)
            if (element.dataset.bgSrc) {
              element.style.backgroundImage = "url('" + element.dataset.bgSrc + "')";
              element.classList.remove("wp-imgpressor-bg-lazy");
              element.classList.add("wp-imgpressor-bg-loaded");
            } else {
              // For Elementor and other CSS-based backgrounds
              // Just mark as loaded so we don't reprocess
              element.classList.add("wp-imgpressor-bg-loaded");
            }

            // Stop observing
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: "200px 0px", // Larger margin for backgrounds
        threshold: 0.01,
      }
    );

    // Initial scan for background elements
    function observeBackgrounds() {
      const bgElements = findBackgroundElements();
      bgElements.forEach(function (element) {
        bgObserver.observe(element);
      });
    }

    // Observe initially
    observeBackgrounds();

    // Re-scan after a delay (for dynamically loaded content)
    setTimeout(observeBackgrounds, 1000);
    setTimeout(observeBackgrounds, 3000);

    // Watch for DOM changes (Elementor editing, AJAX loads, etc.)
    if (window.MutationObserver) {
      const mutationObserver = new MutationObserver(function(mutations) {
        let shouldRescan = false;
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRescan = true;
          }
        });
        if (shouldRescan) {
          setTimeout(observeBackgrounds, 100);
        }
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  } else {
    // Fallback for older browsers - just load everything
    lazyImages.forEach(function (image) {
      if (image.dataset.src) {
        image.src = image.dataset.src;
      }
      if (image.dataset.srcset) {
        image.srcset = image.dataset.srcset;
      }
      image.classList.remove("wp-imgpressor-lazy");
    });

    // No lazy loading for backgrounds in old browsers
    const bgElements = document.querySelectorAll(".wp-imgpressor-bg-lazy");
    bgElements.forEach(function (element) {
      if (element.dataset.bgSrc) {
        element.style.backgroundImage = "url('" + element.dataset.bgSrc + "')";
        element.classList.remove("wp-imgpressor-bg-lazy");
      }
    });
  }
});
