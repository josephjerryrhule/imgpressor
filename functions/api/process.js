// Cloudflare Pages Function using specific method exports
// This approach exports specific handlers for each HTTP method

export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({
      message: "GET request to /process working!",
      endpoint: "/process",
      method: "GET",
      timestamp: new Date().toISOString(),
      note: "Function is deployed and working",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    console.log("POST request received at /api/process");

    const formData = await request.formData();
    const files = formData.getAll("images");
    const url = formData.get("url");
    const format = formData.get("format") || "webp";
    const quality = parseInt(formData.get("quality") || "80");

    console.log("Form data received:", {
      filesCount: files.length,
      hasUrl: !!url,
      format,
      quality,
    });

    if (!files.length && !url) {
      return new Response(
        JSON.stringify({ error: "No files or URL provided" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const results = [];

    // Process uploaded files using Canvas API (no file storage needed)
    for (const file of files) {
      if (file.size === 0) continue;

      try {
        // Create compressed image using Canvas API
        const compressedBlob = await compressImageInMemory(
          file,
          format,
          quality
        );
        const compressedSize = compressedBlob.size;
        const savedBytes = file.size - compressedSize;
        const savedPercentage = ((savedBytes / file.size) * 100).toFixed(1);

        // Convert to data URL for download
        const arrayBuffer = await compressedBlob.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        const dataUrl = `data:image/${format};base64,${base64}`;

        results.push({
          name: file.name,
          originalSize: file.size,
          optimizedSize: compressedSize,
          savedBytes: savedBytes,
          savedPercentage: savedPercentage,
          format: format,
          downloadUrl: dataUrl,
        });
      } catch (compressionError) {
        console.error(
          "Compression error for file:",
          file.name,
          compressionError
        );

        // Convert original file to base64 for download since URL.createObjectURL isn't available
        const arrayBuffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow

        for (let i = 0; i < len; i += chunkSize) {
          binary += String.fromCharCode.apply(
            null,
            bytes.subarray(i, Math.min(i + chunkSize, len))
          );
        }

        const base64 = btoa(binary);
        const dataUrl = `data:${
          file.type || "application/octet-stream"
        };base64,${base64}`;

        // Add as uncompressed if compression fails
        results.push({
          name: file.name,
          originalSize: file.size,
          optimizedSize: file.size,
          savedBytes: 0,
          savedPercentage: "0.0",
          format: format,
          downloadUrl: dataUrl,
          error: `Compression failed: ${compressionError.message}`,
        });
      }
    }

    // Process URL if provided
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Failed to fetch: ${response.status}`);

        const blob = await response.blob();
        const compressedBlob = await compressImageInMemory(
          blob,
          format,
          quality
        );
        const savedBytes = blob.size - compressedBlob.size;
        const savedPercentage = ((savedBytes / blob.size) * 100).toFixed(1);

        const arrayBuffer = await compressedBlob.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );
        const dataUrl = `data:image/${format};base64,${base64}`;

        results.push({
          name: "Downloaded Image",
          originalSize: blob.size,
          optimizedSize: compressedBlob.size,
          savedBytes: savedBytes,
          savedPercentage: savedPercentage,
          format: format,
          downloadUrl: dataUrl,
        });
      } catch (urlError) {
        console.error("URL processing error:", urlError);
        return new Response(
          JSON.stringify({
            error: `URL processing failed: ${urlError.message}`,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }

    console.log("Processing complete:", results.length, "items");

    // Return HTML results page with direct download links
    const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalPercentage =
      totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : "0";

    const resultItems = results
      .map(
        (result) => `
      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">${
          result.name
        }</h3>
        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Original: ${(
            result.originalSize / 1024
          ).toFixed(1)} KB</p>
          <p style="margin: 4px 0; font-size: 14px; color: #6b7280;">Compressed: ${(
            result.optimizedSize / 1024
          ).toFixed(1)} KB</p>
          <p style="margin: 4px 0; font-size: 14px; color: #059669; font-weight: 600;">Saved: ${(
            result.savedBytes / 1024
          ).toFixed(1)} KB (${result.savedPercentage}%)</p>
          ${
            result.error
              ? `<p style="margin: 4px 0; font-size: 12px; color: #dc2626;">${result.error}</p>`
              : ""
          }
        </div>
        <a href="${result.downloadUrl}" download="${
          result.name.split(".")[0]
        }_compressed.${result.format}" 
           style="display: inline-block; background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Download ${result.format.toUpperCase()}
        </a>
      </div>
    `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✅ Compression Complete - ImgPressor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px; margin: 0; line-height: 1.6; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
          .subtitle { color: #6b7280; font-size: 16px; }
          .summary { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; margin-bottom: 30px; }
          .back-btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 20px; }
          .back-btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">🎉 Images Compressed Successfully!</h1>
            <p class="subtitle">Your images have been optimized using Cloudflare Pages Functions</p>
          </div>
          
          <div class="summary">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Compression Results</h2>
            <p style="margin: 8px 0; font-size: 18px;"><strong>Total Space Saved:</strong> ${(
              totalSaved / 1024
            ).toFixed(1)} KB</p>
            <p style="margin: 8px 0; font-size: 18px;"><strong>Average Savings:</strong> ${totalPercentage}%</p>
            <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">Files are ready for immediate download</p>
          </div>
          
          <div>
            ${resultItems}
          </div>
          
          <div style="text-align: center;">
            <a href="/" class="back-btn">Compress More Images</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("POST processing error:", error);

    return new Response(
      JSON.stringify({
        error: "Processing failed",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Image compression function using Canvas API (no file storage)
async function compressImageInMemory(
  fileOrBlob,
  format = "webp",
  quality = 80
) {
  try {
    // Check for API support
    if (typeof createImageBitmap === "undefined") {
      throw new Error("createImageBitmap is not supported in this environment");
    }
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("OffscreenCanvas is not supported in this environment");
    }

    // Create image bitmap from file/blob
    const bitmap = await createImageBitmap(fileOrBlob);

    // Calculate compressed dimensions (reduce by 15% for size reduction)
    const scaleFactor = 0.85;
    const newWidth = Math.round(bitmap.width * scaleFactor);
    const newHeight = Math.round(bitmap.height * scaleFactor);

    // Create offscreen canvas for processing
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");

    // Set canvas to white background for JPEG compatibility
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, newWidth, newHeight);

    // Draw and resize image
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);

    // Convert to desired format
    const outputFormat = format === "jpg" ? "jpeg" : format;
    const qualityValue = quality / 100;

    const blob = await canvas.convertToBlob({
      type: `image/${outputFormat}`,
      quality: qualityValue,
    });

    return blob;
  } catch (error) {
    console.error("Compression error:", error);
    // Throw error to be handled by the caller, which will log it and return original file
    throw error;
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
