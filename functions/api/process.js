// Cloudflare Pages Function for image processing
// This replaces the Express.js /process endpoint

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse the form data
    const formData = await request.formData();
    const files = formData.getAll('files');
    const url = formData.get('url');
    const format = formData.get('format') || 'webp';
    const quality = parseInt(formData.get('quality') || '80');

    if (!files.length && !url) {
      return new Response(JSON.stringify({ error: 'No files or URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    // Process uploaded files
    if (files.length > 0) {
      for (const file of files) {
        if (file.size === 0) continue;
        
        const result = await processImageCloudflare(file, format, quality);
        results.push({
          name: file.name,
          originalSize: file.size,
          optimizedSize: result.size,
          savedBytes: file.size - result.size,
          savedPercentage: ((file.size - result.size) / file.size * 100).toFixed(2),
          format: format,
          downloadUrl: result.url
        });
      }
    }

    // Process URL
    if (url) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
          throw new Error('URL does not point to a valid image');
        }

        const blob = await response.blob();
        const file = new File([blob], 'url_image.jpg', { type: contentType });
        
        const result = await processImageCloudflare(file, format, quality);
        results.push({
          name: 'Downloaded Image',
          originalSize: blob.size,
          optimizedSize: result.size,
          savedBytes: blob.size - result.size,
          savedPercentage: ((blob.size - result.size) / blob.size * 100).toFixed(2),
          format: format,
          downloadUrl: result.url
        });
      } catch (urlError) {
        return new Response(JSON.stringify({ error: `URL processing failed: ${urlError.message}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Return JSON for direct API calls or browser display for form submissions
    const acceptHeader = request.headers.get('accept') || '';
    
    if (acceptHeader.includes('application/json')) {
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate HTML response for form submissions
    const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalPercentage = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(2) : '0';

    const resultItems = results.map(result => `
      <div class="bg-white p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold mb-4 text-gray-700">${result.name}</h3>
        <div class="grid grid-cols-1 gap-4 mb-4">
          <div>
            <p class="text-sm text-gray-600 mb-2">Results</p>
            <p class="text-xs text-gray-500">Original: ${(result.originalSize / 1024).toFixed(2)} KB</p>
            <p class="text-xs text-gray-500">Optimized: ${(result.optimizedSize / 1024).toFixed(2)} KB</p>
            <p class="text-sm text-green-600 font-medium">Saved: ${(result.savedBytes / 1024).toFixed(2)} KB (${result.savedPercentage}%)</p>
          </div>
        </div>
        <a href="${result.downloadUrl}" download class="mt-2 inline-block bg-green-600 text-white text-sm py-2 px-4 rounded hover:bg-green-700">
          Download ${result.format.toUpperCase()}
        </a>
      </div>
    `).join('');

    const resultHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Compression Results - ImgPressor</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 min-h-screen py-8">
        <div class="max-w-6xl mx-auto px-4">
          <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Images Compressed Successfully!</h1>
          
          <div class="bg-white p-6 rounded-lg shadow-md text-center mb-8">
            <h2 class="text-2xl font-semibold mb-4 text-gray-800">Total Results</h2>
            <p class="text-lg"><strong>Total Space Saved:</strong> ${(totalSaved / 1024).toFixed(2)} KB</p>
            <p class="text-lg"><strong>Average Savings:</strong> ${totalPercentage}%</p>
          </div>
          
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            ${resultItems}
          </div>
          
          <div class="text-center">
            <a href="/" class="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
              Compress More Images
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(resultHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return new Response(JSON.stringify({ error: `Processing failed: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Image processing function using Canvas API (available in Cloudflare Workers)
async function processImageCloudflare(file, format = 'webp', quality = 80) {
  try {
    // Create an image bitmap from the file
    const bitmap = await createImageBitmap(file);
    
    // Calculate new dimensions (reduce by factor for compression)
    const scaleFactor = 0.8; // Reduce size by 20% for compression
    const newWidth = Math.round(bitmap.width * scaleFactor);
    const newHeight = Math.round(bitmap.height * scaleFactor);
    
    // Create an offscreen canvas
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    // Draw and resize the image
    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
    
    // Convert to the desired format
    const outputFormat = format === 'jpg' ? 'jpeg' : format;
    const qualityValue = quality / 100;
    
    const blob = await canvas.convertToBlob({
      type: `image/${outputFormat}`,
      quality: qualityValue
    });
    
    // Convert blob to data URL for download
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:image/${outputFormat};base64,${base64}`;
    
    return {
      size: blob.size,
      url: dataUrl
    };
    
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}