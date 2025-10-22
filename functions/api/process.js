// Cloudflare Pages Function for image processing
// This replaces the Express.js /process endpoint

// Cloudflare Pages Function for image processing
// This replaces the Express.js /process endpoint

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('Processing POST request to /api/process');
    
    // Parse the form data
    const formData = await request.formData();
    const files = formData.getAll('files') || formData.getAll('images');
    const url = formData.get('url');
    const format = formData.get('format') || 'webp';
    const quality = parseInt(formData.get('quality') || '80');

    console.log('Request details:', { 
      fileCount: files.length, 
      url: !!url, 
      format, 
      quality 
    });

    if (!files.length && !url) {
      return new Response(JSON.stringify({ error: 'No files or URL provided' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // For now, return a simple success response to test the endpoint
    const results = [];
    
    if (files.length > 0) {
      for (const file of files) {
        if (file.size === 0) continue;
        
        results.push({
          name: file.name,
          originalSize: file.size,
          optimizedSize: Math.round(file.size * 0.7), // Simulate 30% compression
          savedBytes: Math.round(file.size * 0.3),
          savedPercentage: "30.00",
          format: format,
          downloadUrl: "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAD8D+JaQAA3AAAAAA" // Tiny test image
        });
      }
    }

    if (url) {
      results.push({
        name: 'Downloaded Image',
        originalSize: 100000, // Mock size
        optimizedSize: 70000,
        savedBytes: 30000,
        savedPercentage: "30.00",
        format: format,
        downloadUrl: "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAD8D+JaQAA3AAAAAA"
      });
    }

    console.log('Results prepared:', results.length, 'items');

    // Return JSON for direct API calls or browser display for form submissions
    const acceptHeader = request.headers.get('accept') || '';
    
    if (acceptHeader.includes('application/json')) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Processing complete (test mode)',
        results 
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate simple HTML response for form submissions
    const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalPercentage = totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(2) : '0';

    const resultItems = results.map(result => `
      <div style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 16px;">
        <h3 style="margin: 0 0 16px 0; color: #374151;">${result.name}</h3>
        <div style="margin-bottom: 16px;">
          <p style="margin: 4px 0; font-size: 14px; color: #6B7280;">Original: ${(result.originalSize / 1024).toFixed(2)} KB</p>
          <p style="margin: 4px 0; font-size: 14px; color: #6B7280;">Optimized: ${(result.optimizedSize / 1024).toFixed(2)} KB</p>
          <p style="margin: 4px 0; font-size: 14px; color: #059669; font-weight: 500;">Saved: ${(result.savedBytes / 1024).toFixed(2)} KB (${result.savedPercentage}%)</p>
        </div>
        <a href="${result.downloadUrl}" download="${result.name.split('.')[0]}_compressed.${result.format}" style="display: inline-block; background: #059669; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">
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
        <title>Test Results - ImgPressor</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f3f4f6; padding: 32px 16px; margin: 0; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 32px; }
          .title { font-size: 32px; font-weight: bold; color: #1f2937; margin-bottom: 16px; }
          .summary { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; margin-bottom: 32px; }
          .summary h2 { margin: 0 0 16px 0; font-size: 24px; color: #1f2937; }
          .summary p { margin: 8px 0; font-size: 18px; }
          .results { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
          .back-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">Test Compression Complete!</h1>
          </div>
          
          <div class="summary">
            <h2>Total Results (Test Mode)</h2>
            <p><strong>Total Space Saved:</strong> ${(totalSaved / 1024).toFixed(2)} KB</p>
            <p><strong>Average Savings:</strong> ${totalPercentage}%</p>
          </div>
          
          <div class="results">
            ${resultItems}
          </div>
          
          <div class="center">
            <a href="/" class="back-button">Test More Images</a>
          </div>
        </div>
      </body>
      </html>
    `;

    return new Response(resultHtml, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Processing error:', error);
    return new Response(JSON.stringify({ 
      error: `Processing failed: ${error.message}`,
      stack: error.stack
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
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