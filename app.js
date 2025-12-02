const express = require("express");
const sharp = require("sharp");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const compression = require("compression");

// Version: 2.3.0 - Performance optimizations and cache busting
const multer = require("multer");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 3001;

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Optional multer middleware - only applies when Content-Type is multipart/form-data
const optionalUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  next();
};

// Cloudflare IP detection utility
const getRealIP = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    "unknown"
  );
};

// Enable compression for all responses
app.use(
  compression({
    level: 6, // Good balance between compression and speed
    threshold: 1024, // Only compress files larger than 1KB
    filter: (req, res) => {
      // Compress everything except images (already compressed)
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Request logging middleware for debugging
app.use((req, res, next) => {
  const realIP = getRealIP(req);
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url} [${realIP}]`
  );
  if (req.url.includes("/process")) {
    console.log("Process request - Headers:", Object.keys(req.headers));
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Real IP:", realIP);
    console.log("CF-Country:", req.headers["cf-ipcountry"] || "unknown");
  }
  next();
});

// Middleware
// Determine static directory - use dist if it exists (built), otherwise public
const staticDir = fs.existsSync(path.join(__dirname, "dist"))
  ? "dist"
  : "public";
console.log(`📁 Serving static files from: ${staticDir}/`);

// Cache-busting for static files during development/updates
app.use(
  express.static(staticDir, {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith(".html")) {
        // No cache for HTML files to ensure updates are seen
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (path.endsWith(".css") || path.endsWith(".js")) {
        // Short cache for CSS/JS with ETag for cache validation
        res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
      } else {
        // Longer cache for images and other assets
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cloudflare-optimized cache headers for processed images
app.use("/optimized", (req, res, next) => {
  res.set({
    "Cache-Control": "public, max-age=3600, s-maxage=86400", // 1 hour browser, 1 day CDN
    "X-Content-Type-Options": "nosniff",
    Vary: "Accept-Encoding",
  });
  next();
});

// No-cache headers for API endpoints
app.use(["/process", "/storage-status"], (req, res, next) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  next();
});

// Helper function to download image
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        "User-Agent": "Image-Compressor-App/1.0",
      },
    });

    // Check if response is an image
    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error("The provided URL does not point to a valid image.");
    }

    return Buffer.from(response.data);
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Failed to download image: ${error.response.status} ${error.response.statusText}`
      );
    } else if (error.code === "ENOTFOUND") {
      throw new Error("Invalid URL or unable to reach the server.");
    } else {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

// Helper function to process image in memory using Canvas API (unified approach)
async function processImageInMemory(buffer, quality = 80, format = "webp") {
  try {
    // Create an image bitmap from the buffer
    const arrayBuffer =
      buffer instanceof ArrayBuffer
        ? buffer
        : buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
          );
    const blob = new Blob([arrayBuffer]);
    const imageBitmap = await createImageBitmap(blob);

    // Calculate new dimensions (reduce by 1.5x for compression)
    const newWidth = Math.round(imageBitmap.width / 1.5);
    const newHeight = Math.round(imageBitmap.height / 1.5);

    // Create canvas and draw the resized image
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    // Convert quality percentage to 0-1 range
    const qualityValue = Math.max(0.1, Math.min(1.0, quality / 100));

    // Convert to desired format
    let outputBlob;
    switch (format.toLowerCase()) {
      case "jpeg":
      case "jpg":
        outputBlob = await canvas.convertToBlob({
          type: "image/jpeg",
          quality: qualityValue,
        });
        format = "jpeg";
        break;
      case "png":
        outputBlob = await canvas.convertToBlob({
          type: "image/png",
        });
        format = "png";
        break;
      case "webp":
      default:
        outputBlob = await canvas.convertToBlob({
          type: "image/webp",
          quality: qualityValue,
        });
        format = "webp";
        break;
    }

    // Convert blob to array buffer
    const outputArrayBuffer = await outputBlob.arrayBuffer();

    // Clean up
    imageBitmap.close();

    return {
      buffer: outputArrayBuffer,
      format: format,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

// Helper function to process image for server response (matches existing interface)
async function processImageInMemory(
  buffer,
  filename,
  quality,
  format = "webp",
  url = null
) {
  const originalSize = buffer.length;

  // Process image using Canvas API
  const processed = await processImageInMemoryBase(buffer, quality, format);
  const optimizedBuffer = Buffer.from(processed.buffer);
  const outputFormat = processed.format;
  const optimizedSize = optimizedBuffer.length;

  // Create data URL for download (no file storage)
  const base64Data = optimizedBuffer.toString("base64");
  const mimeType = `image/${outputFormat}`;
  const downloadUrl = `data:${mimeType};base64,${base64Data}`;

  // Create original preview data URL
  let originalPreview;
  if (url) {
    originalPreview = url;
  } else {
    const originalBase64 = buffer.toString("base64");
    const originalMimeType = "image/jpeg"; // Default
    originalPreview = `data:${originalMimeType};base64,${originalBase64}`;
  }

  // Calculate savings
  const savedBytes = originalSize - optimizedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(2);

  return {
    name: filename,
    originalPreview,
    optimizedFilename: `${filename.split(".")[0]}_compressed.${outputFormat}`, // For display only
    originalSize,
    optimizedSize,
    savedBytes,
    savedPercentage,
    format: outputFormat,
    downloadUrl, // Data URL for immediate download
  };
}

// Helper function to process image in memory using Sharp (unified approach for server)
async function processImageInMemoryBase(buffer, quality = 80, format = "webp") {
  try {
    // Get metadata
    const metadata = await sharp(buffer).metadata();

    // Calculate new dimensions (reduce by 1.5x for compression)
    const newHeight = Math.round(metadata.height / 1.5);

    // Start with resize - use faster algorithms for better performance
    let pipeline = sharp(buffer, {
      // Performance optimizations
      sequentialRead: true,
      density: 72, // Lower DPI for web use
    }).resize({
      height: newHeight,
      withoutEnlargement: true,
      kernel: sharp.kernel.cubic, // Faster than lanczos
    });

    // Apply format-specific optimization with speed focus
    switch (format.toLowerCase()) {
      case "webp":
        pipeline = pipeline.webp({
          quality: parseInt(quality),
          effort: 2, // Reduced from 4 for speed (0-6 scale)
          smartSubsample: true, // Faster subsampling
        });
        break;

      case "avif":
        pipeline = pipeline.avif({
          quality: parseInt(quality),
          effort: 2, // Reduced from 4 for speed (0-9 scale)
          chromaSubsampling: "4:2:0", // Faster subsampling
        });
        break;

      case "jpeg":
      case "jpg":
        pipeline = pipeline.jpeg({
          quality: parseInt(quality),
          progressive: false, // Faster than progressive
          mozjpeg: false, // Use faster libjpeg instead of mozjpeg
          optimiseScans: false, // Skip scan optimization for speed
        });
        format = "jpeg";
        break;

      case "png":
        pipeline = pipeline.png({
          quality: parseInt(quality),
          compressionLevel: 6, // Reduced from 9 for speed (0-9 scale)
          progressive: false, // Faster than progressive
          adaptiveFiltering: false, // Skip adaptive filtering for speed
        });
        break;

      default:
        // Default to WebP for unsupported formats
        pipeline = pipeline.webp({
          quality: parseInt(quality),
          effort: 2,
          smartSubsample: true,
        });
        format = "webp";
    }

    const optimizedBuffer = await pipeline.toBuffer();

    return {
      buffer: optimizedBuffer,
      format: format,
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

// Helper function to save buffer
function saveBuffer(buffer, originalFilename, ext = "webp") {
  // Extract name without extension and add new extension
  const nameWithoutExt = path.parse(originalFilename).name;
  const filename = `${nameWithoutExt}.${ext}`;
  const filepath = path.join(__dirname, "public", "optimized", filename);

  fs.writeFileSync(filepath, buffer);
  return filename;
} // Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Debug route to check if server is responding
app.get("/test", (req, res) => {
  res.json({
    status: "Server is working",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    port: PORT,
    version: require("./package.json").version,
    routes: [
      "GET /",
      "POST /process",
      "GET /health",
      "GET /storage-status",
      "GET /download-all/:sessionId",
      "GET /test",
    ],
  });
});

// Simple test form for POST /process
app.get("/test-form", (req, res) => {
  res.send(`
        <html>
        <body>
            <h1>Test Form for /process endpoint</h1>
            <form action="/process" method="POST" enctype="multipart/form-data">
                <p>Test URL: <input type="url" name="url" value="https://picsum.photos/400/300" /></p>
                <p>Quality: <input type="number" name="quality" value="80" min="10" max="100" /></p>
                <button type="submit">Test Process</button>
            </form>
            <br>
            <a href="/">Back to main app</a>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require("./package.json").version,
  });
});

app.post("/process", upload.array("images", 10), async (req, res) => {
  console.log("POST /process - Request received");
  console.log("Files:", req.files ? req.files.length : 0);
  console.log("Body URL:", req.body.url || "none");

  try {
    const quality = req.body.quality || 80;
    const format = req.body.format || "webp";
    let results = [];

    console.log("Processing with format:", format, "quality:", quality);

    if (req.files && req.files.length > 0) {
      // Process uploaded files using Canvas API (no file storage)
      for (const file of req.files) {
        const result = await processImageInMemory(
          file.buffer,
          file.originalname,
          quality,
          format
        );
        results.push(result);
      }
    } else if (req.body.url) {
      // Process URL using Canvas API
      const originalBuffer = await downloadImage(req.body.url);
      const result = await processImageInMemory(
        originalBuffer,
        "url_image.jpg",
        quality,
        format,
        req.body.url
      );
      results.push(result);
    } else {
      return res
        .status(400)
        .send(
          '<h1>Error: Please provide images or a URL.</h1><a href="/">Go back</a>'
        );
    }

    // Handle single file direct download if requested via AJAX
    if (
      req.headers.accept &&
      req.headers.accept.includes("application/json") &&
      results.length === 1
    ) {
      const result = results[0];

      // Return the compressed image directly as binary data
      const base64Data = result.downloadUrl.split(",")[1];
      const imageBuffer = Buffer.from(base64Data, "base64");

      const mimeTypes = {
        webp: "image/webp",
        avif: "image/avif",
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        png: "image/png",
      };

      res.setHeader("Content-Type", mimeTypes[result.format] || "image/webp");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.name.split(".")[0]}_compressed.${
          result.format
        }"`
      );
      return res.send(imageBuffer);
    }

    // Generate result page
    const resultItems = results
      .map(
        (result) => `
            <div class="bg-white p-4 rounded-lg shadow-md">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">${
                  result.name
                }</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Original</p>
                        <img src="${
                          result.originalPreview
                        }" alt="Original" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(
                          result.originalSize / 1024
                        ).toFixed(2)} KB</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Optimized (${
                          result.format?.toUpperCase() || "WebP"
                        })</p>
                        <img src="${
                          result.downloadUrl
                        }" alt="Optimized" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(
                          result.optimizedSize / 1024
                        ).toFixed(2)} KB</p>
                    </div>
                </div>
                <p class="text-sm text-green-600 font-medium">Saved: ${(
                  result.savedBytes / 1024
                ).toFixed(2)} KB (${result.savedPercentage}%)</p>
                <a href="${result.downloadUrl}" download="${
          result.optimizedFilename
        }" class="mt-2 inline-block btn-success text-sm py-2 px-4">
                    Download
                </a>
            </div>
        `
      )
      .join("");

    const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalPercentage = ((totalSaved / totalOriginal) * 100).toFixed(2);

    // Create session ID for download all functionality
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Store results in temporary file for download all
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(
      path.join(tempDir, `${sessionId}.json`),
      JSON.stringify(results)
    );

    // Download all button (only show if more than one image)
    const downloadAllButton =
      results.length > 1
        ? `
            <a href="/download-all/${sessionId}" class="btn-purple inline-block mr-4 py-2 px-6">
                Download All as ZIP
            </a>
        `
        : "";

    const resultHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Compression Results</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body class="bg-gray-100 min-h-screen py-8">
                <div class="max-w-6xl mx-auto px-4">
                    <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Images Compressed Successfully!</h1>
                    
                    <div class="bg-white p-6 rounded-lg shadow-md text-center mb-8">
                        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Total Results</h2>
                        <p class="text-lg"><strong>Total Space Saved:</strong> ${(
                          totalSaved / 1024
                        ).toFixed(2)} KB</p>
                        <p class="text-lg"><strong>Average Savings:</strong> ${totalPercentage}%</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        ${resultItems}
                    </div>
                    
                    <div class="text-center">
                        ${downloadAllButton}
                        <a href="/" class="btn-primary inline-block py-2 px-6">
                            Compress More Images
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `;

    res.send(resultHtml);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
  }
});

// Alias route for /api/process (handles frontend requests to /api/process)
app.post("/api/process", upload.array("images", 10), async (req, res) => {
  console.log("POST /api/process - Forwarding to /process handler");
  console.log("Files:", req.files ? req.files.length : 0);
  console.log("Body URL:", req.body.url || "none");

  try {
    const quality = req.body.quality || 80;
    const format = req.body.format || "webp";
    let results = [];

    console.log("Processing with format:", format, "quality:", quality);

    if (req.files && req.files.length > 0) {
      // Process uploaded files using Canvas API (no file storage)
      for (const file of req.files) {
        const result = await processImageInMemory(
          file.buffer,
          file.originalname,
          quality,
          format
        );
        results.push(result);
      }
    } else if (req.body.url) {
      // Process URL using Canvas API
      const originalBuffer = await downloadImage(req.body.url);
      const result = await processImageInMemory(
        originalBuffer,
        "url_image.jpg",
        quality,
        format,
        req.body.url
      );
      results.push(result);
    } else {
      return res
        .status(400)
        .send(
          '<h1>Error: Please provide images or a URL.</h1><a href="/">Go back</a>'
        );
    }

    // Handle single file direct download if requested via AJAX
    if (
      req.headers.accept &&
      req.headers.accept.includes("application/json") &&
      results.length === 1
    ) {
      const result = results[0];

      // Return the compressed image directly as binary data
      const base64Data = result.downloadUrl.split(",")[1];
      const imageBuffer = Buffer.from(base64Data, "base64");

      const mimeTypes = {
        webp: "image/webp",
        avif: "image/avif",
        jpeg: "image/jpeg",
        jpg: "image/jpeg",
        png: "image/png",
      };

      res.setHeader("Content-Type", mimeTypes[result.format] || "image/webp");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.name.split(".")[0]}_compressed.${
          result.format
        }"`
      );
      return res.send(imageBuffer);
    }

    // Generate result page
    const resultItems = results
      .map(
        (result) => `
            <div class="bg-white p-4 rounded-lg shadow-md">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">${
                  result.name
                }</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Original</p>
                        <img src="${
                          result.originalPreview
                        }" alt="Original" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(
                          result.originalSize / 1024
                        ).toFixed(2)} KB</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Optimized (${
                          result.format?.toUpperCase() || "WebP"
                        })</p>
                        <img src="${
                          result.downloadUrl
                        }" alt="Optimized" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(
                          result.optimizedSize / 1024
                        ).toFixed(2)} KB</p>
                    </div>
                </div>
                <p class="text-sm text-green-600 font-medium">Saved: ${(
                  result.savedBytes / 1024
                ).toFixed(2)} KB (${result.savedPercentage}%)</p>
                <a href="${result.downloadUrl}" download="${
          result.optimizedFilename
        }" class="mt-2 inline-block btn-success text-sm py-2 px-4">
                    Download
                </a>
            </div>
        `
      )
      .join("");

    const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalPercentage = ((totalSaved / totalOriginal) * 100).toFixed(2);

    // Create session ID for download all functionality
    const sessionId = crypto.randomBytes(16).toString("hex");

    // Store results in temporary file for download all
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    fs.writeFileSync(
      path.join(tempDir, `${sessionId}.json`),
      JSON.stringify(results)
    );

    // Download all button (only show if more than one image)
    const downloadAllButton =
      results.length > 1
        ? `
            <a href="/download-all/${sessionId}" class="btn-purple inline-block mr-4 py-2 px-6">
                Download All as ZIP
            </a>
        `
        : "";

    const resultHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Compression Results</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body class="bg-gray-100 min-h-screen py-8">
                <div class="max-w-6xl mx-auto px-4">
                    <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Images Compressed Successfully!</h1>
                    
                    <div class="bg-white p-6 rounded-lg shadow-md text-center mb-8">
                        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Total Results</h2>
                        <p class="text-lg"><strong>Total Space Saved:</strong> ${(
                          totalSaved / 1024
                        ).toFixed(2)} KB</p>
                        <p class="text-lg"><strong>Average Savings:</strong> ${totalPercentage}%</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        ${resultItems}
                    </div>
                    
                    <div class="text-center">
                        ${downloadAllButton}
                        <a href="/" class="btn-primary inline-block py-2 px-6">
                            Compress More Images
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `;

    res.send(resultHtml);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
  }
});

// Download all route (updated for Canvas API approach)
app.get("/download-all/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const tempFilePath = path.join(__dirname, "temp", `${sessionId}.json`);

    // Check if session file exists
    if (!fs.existsSync(tempFilePath)) {
      return res
        .status(404)
        .send('<h1>Session expired or invalid</h1><a href="/">Go back</a>');
    }

    // Read results from temp file
    const results = JSON.parse(fs.readFileSync(tempFilePath, "utf8"));

    // Set response headers for ZIP download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="compressed-images.zip"'
    );

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Best compression
    });

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).send("Error creating archive");
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add each optimized image to the archive from data URLs
    for (const result of results) {
      if (result.downloadUrl && result.downloadUrl.startsWith("data:")) {
        // Extract base64 data from data URL
        const base64Data = result.downloadUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        // Add buffer to archive
        archive.append(buffer, { name: result.optimizedFilename });
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Clean up temp file after a delay (optional)
    setTimeout(() => {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }, 60000); // Delete after 1 minute
  } catch (error) {
    console.error("Download all error:", error);
    res
      .status(500)
      .send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
  }
});

// Helper function to process a single image (updated for Canvas API)
async function processImage(
  buffer,
  filename,
  quality,
  format = "webp",
  url = null
) {
  // Use the Canvas API processing function directly
  return await processImageInMemory(buffer, filename, quality, format, url);
}

/**
 * POST /api/upload
 * Upload an image (file or URL) and receive metadata with conversion options
 * 
 * Usage with file:
 * const formData = new FormData();
 * formData.append('image', fileInput.files[0]);
 * 
 * fetch('/api/upload', {
 *   method: 'POST',
 *   body: formData
 * })
 * 
 * Usage with URL:
 * const formData = new FormData();
 * formData.append('url', 'https://example.com/image.jpg');
 * 
 * fetch('/api/upload', {
 *   method: 'POST',
 *   body: formData
 * })
 * 
 * OR with JSON:
 * fetch('/api/upload', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ url: 'https://example.com/image.jpg' })
 * })
 * 
 * Response includes:
 * - image metadata (width, height, format, size)
 * - base64 preview
 * - sessionId for later conversion
 * - available conversion formats
 */
app.post("/api/upload", optionalUpload, async (req, res) => {
  console.log("POST /api/upload - Request received");
  console.log("Content-Type:", req.headers['content-type']);

  try {
    let buffer;
    let filename;

    // Check if image file was uploaded
    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname;
    }
    // Check if URL was provided (FormData or JSON)
    else if (req.body.url) {
      console.log("Downloading image from URL:", req.body.url);
      try {
        buffer = await downloadImage(req.body.url);
        filename = req.body.url.split("/").pop() || "url_image";
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Failed to download image from URL: ${error.message}`,
        });
      }
    }
    // No file or URL provided
    else {
      return res.status(400).json({
        success: false,
        error: "No image file or URL provided. Please provide either 'image' file or 'url' parameter.",
      });
    }

    // Get image metadata using Sharp
    const metadata = await sharp(buffer).metadata();

    // Generate base64 preview of original
    const originalBase64 = buffer.toString("base64");
    const originalMimeType = `image/${metadata.format}`;

    // Prepare response with metadata and conversion options
    const response = {
      success: true,
      image: {
        filename: filename,
        originalFormat: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        sizeKB: (buffer.length / 1024).toFixed(2),
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        preview: `data:${originalMimeType};base64,${originalBase64}`,
      },
      conversionOptions: {
        formats: ["webp", "avif", "jpeg", "png"],
        qualityRange: { min: 10, max: 100, default: 80 },
      },
      // Include a session ID for future conversion requests
      sessionId: crypto.randomBytes(16).toString("hex"),
    };

    // Temporarily store the buffer in memory cache for conversion
    // (In production, consider using Redis or a proper cache)
    if (!global.imageCache) {
      global.imageCache = new Map();
    }
    global.imageCache.set(response.sessionId, {
      buffer: buffer,
      filename: filename,
      uploadedAt: Date.now(),
    });

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      global.imageCache.delete(response.sessionId);
    }, 600000);

    res.json(response);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/convert
 * Convert a previously uploaded image to specified format
 * 
 * Usage:
 * fetch('/api/convert', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     sessionId: 'abc123...', // from /api/upload response
 *     format: 'webp',         // 'webp', 'avif', 'jpeg', 'png'
 *     quality: 80             // 10-100
 *   })
 * })
 * .then(res => res.json())
 * .then(data => {
 *   console.log('Converted image:', data.result.preview);
 *   console.log('Saved:', data.result.savedPercentage + '%');
 * });
 * 
 * Response includes:
 * - converted image preview (base64)
 * - size comparison stats
 * - savings percentage
 * - suggested download filename
 */
app.post("/api/convert", async (req, res) => {
  console.log("POST /api/convert - Request received");

  try {
    const { sessionId, format = "webp", quality = 80 } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID is required",
      });
    }

    // Retrieve cached image buffer
    if (!global.imageCache || !global.imageCache.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: "Image session not found or expired. Please upload again.",
      });
    }

    const cached = global.imageCache.get(sessionId);
    const buffer = cached.buffer;
    const filename = cached.filename;

    // Validate format
    const allowedFormats = ["webp", "avif", "jpeg", "jpg", "png"];
    if (!allowedFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Allowed formats: ${allowedFormats.join(", ")}`,
      });
    }

    // Process the image
    const processed = await processImageInMemoryBase(buffer, quality, format);
    const optimizedBuffer = Buffer.from(processed.buffer);

    // Calculate stats
    const originalSize = buffer.length;
    const optimizedSize = optimizedBuffer.length;
    const savedBytes = originalSize - optimizedSize;
    const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(2);

    // Create base64 for preview
    const base64Data = optimizedBuffer.toString("base64");
    const mimeType = `image/${processed.format}`;

    res.json({
      success: true,
      format: processed.format,
      quality: quality,
      preview: `data:${mimeType};base64,${base64Data}`,
      originalSize: originalSize,
      convertedSize: optimizedSize,
      savedBytes: savedBytes,
      savedPercentage: savedPercentage,
      originalFilename: filename,
      downloadFilename: `${filename.split(".")[0]}_${processed.format}.${processed.format}`,
    });
  } catch (error) {
    console.error("Convert error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).send(`
        <h1>404 - Route Not Found</h1>
        <p>The requested route <strong>${req.method} ${req.url}</strong> was not found.</p>
        <p>Available routes:</p>
        <ul>
            <li>GET / - Main page</li>
            <li>POST /process - Image processing</li>
            <li>GET /health - Health check</li>
            <li>GET /test - Server test</li>
            <li>GET /download-all/:sessionId - Download all files</li>
        </ul>
        <a href="/">Go back to home</a>
    `);
});

// Error handling for server errors
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send(`
        <h1>500 - Internal Server Error</h1>
        <p>Error: ${err.message}</p>
        <a href="/">Go back to home</a>
    `);
});

// Cleanup function
function cleanupFiles() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
  const sixHours = 6 * oneHour; // 6 hours

  // Clean temp directory (1 hour old files)
  try {
    const tempDir = path.join(__dirname, "temp");
    if (fs.existsSync(tempDir)) {
      const tempFiles = fs.readdirSync(tempDir);
      tempFiles.forEach((file) => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > oneHour) {
          fs.unlinkSync(filePath);
          console.log(`🧹 Cleaned temp file: ${file}`);
        }
      });
    }
  } catch (error) {
    console.error("Error cleaning temp directory:", error.message);
  }

  // Clean optimized directory (6 hour old files)
  try {
    const optimizedDir = path.join(__dirname, "public", "optimized");
    if (fs.existsSync(optimizedDir)) {
      function cleanDirectory(dir) {
        const items = fs.readdirSync(dir);
        items.forEach((item) => {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);

          if (stats.isDirectory()) {
            cleanDirectory(itemPath); // Recursively clean subdirectories
            // Remove empty directories
            try {
              if (fs.readdirSync(itemPath).length === 0) {
                fs.rmdirSync(itemPath);
                console.log(`🧹 Removed empty directory: ${item}`);
              }
            } catch (e) {}
          } else if (now - stats.mtime.getTime() > sixHours) {
            fs.unlinkSync(itemPath);
            console.log(`🧹 Cleaned optimized file: ${item}`);
          }
        });
      }
      cleanDirectory(optimizedDir);
    }
  } catch (error) {
    console.error("Error cleaning optimized directory:", error.message);
  }
}

// Storage monitoring utilities
const { execSync } = require("child_process");

class StorageMonitor {
  static getDiskUsage() {
    try {
      // Use current working directory as a more portable approach
      const targetPath = process.cwd();
      const output = execSync(`df -h "${targetPath}"`, { encoding: "utf8" });
      const lines = output.trim().split("\n");
      const dataLine = lines[1].split(/\s+/);

      return {
        total: dataLine[1],
        used: dataLine[2],
        available: dataLine[3],
        percentage: parseInt(dataLine[4].replace("%", "")),
      };
    } catch (error) {
      console.error("Error getting disk usage:", error.message);
      return {
        total: "Unknown",
        used: "Unknown",
        available: "Unknown",
        percentage: 0,
      };
    }
  }

  static getDirectorySize(dirPath) {
    try {
      const output = execSync(`du -sh ${dirPath}`, { encoding: "utf8" });
      return output.trim().split("\t")[0];
    } catch (error) {
      return "0B";
    }
  }

  static checkStorageHealth() {
    const usage = this.getDiskUsage();
    if (!usage) return "unknown";

    if (usage.percentage > 90) {
      console.log(`🚨 CRITICAL: Disk usage at ${usage.percentage}%`);
      return "critical";
    } else if (usage.percentage > 80) {
      console.log(`⚠️  WARNING: Disk usage at ${usage.percentage}%`);
      return "high";
    }

    return "normal";
  }

  static emergencyCleanup() {
    console.log("🚨 Running emergency cleanup...");
    try {
      execSync("rm -rf ./temp/*");
      execSync("find ./public/optimized -type f -mmin +10 -delete");
      console.log("✅ Emergency cleanup completed");
    } catch (error) {
      console.error("Emergency cleanup failed:", error.message);
    }
  }
}

// Storage status endpoint
app.get("/storage-status", (req, res) => {
  console.log("📊 Storage status endpoint accessed");
  try {
    const usage = StorageMonitor.getDiskUsage();
    const tempSize = StorageMonitor.getDirectorySize("./temp");
    const optimizedSize = StorageMonitor.getDirectorySize("./public/optimized");

    const response = {
      status: "success",
      disk: usage,
      directories: {
        temp: tempSize,
        optimized: optimizedSize,
      },
      app: {
        version: require("./package.json").version,
        currentDirectory: process.cwd(),
        environment: process.env.NODE_ENV,
      },
      cloudflare: {
        country: req.headers["cf-ipcountry"] || "unknown",
        realIP: getRealIP(req),
        ray: req.headers["cf-ray"] || "unknown",
        cacheStatus: req.headers["cf-cache-status"] || "unknown",
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      "📊 Storage status response:",
      JSON.stringify(response, null, 2)
    );
    res.json(response);
  } catch (error) {
    console.error("❌ Storage status error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Enhanced cleanup with storage monitoring
function smartCleanup() {
  const storageHealth = StorageMonitor.checkStorageHealth();

  if (storageHealth === "critical") {
    StorageMonitor.emergencyCleanup();
  } else {
    cleanupFiles();
  }
}

// Run cleanup every 30 minutes
setInterval(smartCleanup, 30 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(smartCleanup, 5000);

// Debug endpoint to check deployment sync
app.get("/debug-version", (req, res) => {
  try {
    const packageJson = require("./package.json");
    const fs = require("fs");
    const packagePath = require.resolve("./package.json");
    const packageStats = fs.statSync(packagePath);

    res.json({
      packageVersion: packageJson.version,
      packagePath: packagePath,
      packageModified: packageStats.mtime,
      currentTime: new Date().toISOString(),
      processUptime: process.uptime(),
      nodeVersion: process.version,
      deployment: {
        lastCommit: "571ddbe - Force deployment trigger",
        expectedVersion: "2.3.0",
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Performance test endpoint
app.get("/perf-test", async (req, res) => {
  try {
    // Create a test image buffer (1x1 pixel)
    const testBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const startTime = Date.now();

    // Test compression
    await optimizeImage(testBuffer, 80, "webp");

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    res.json({
      status: "ok",
      processingTime: `${processingTime}ms`,
      performance:
        processingTime < 100
          ? "excellent"
          : processingTime < 500
          ? "good"
          : processingTime < 1000
          ? "fair"
          : "slow",
      timestamp: new Date().toISOString(),
      serverInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: Math.round(process.uptime()),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🧹 Automatic cleanup enabled (every 30 minutes)`);
  console.log(`Available routes:`);
  console.log(`  GET  / - Main page`);
  console.log(`  POST /process - Image processing (legacy)`);
  console.log(
    `  POST /api/process - Image processing (Cloudflare Pages compatibility)`
  );
  console.log(`  POST /api/upload - Upload image and get metadata`);
  console.log(`  POST /api/convert - Convert uploaded image to format`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /storage-status - Storage monitoring`);
  console.log(`  GET  /download-all/:sessionId - Download ZIP`);
  console.log(`  GET  /test - Server test`);
});
