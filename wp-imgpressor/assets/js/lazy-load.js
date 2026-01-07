document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = document.querySelectorAll("img.wp-imgpressor-lazy");

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
  }
});
