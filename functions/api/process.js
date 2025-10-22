// Cloudflare Pages Function for image processing
// This replaces the Express.js /process endpoint

// Simple Cloudflare Pages Function - testing basic functionality

export async function onRequest(context) {
  const { request } = context;
  const method = request.method;

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // Handle GET - test endpoint
  if (method === 'GET') {
    return new Response(JSON.stringify({
      message: 'Cloudflare Pages Function is working!',
      method: 'GET',
      timestamp: new Date().toISOString(),
      endpoint: '/api/process'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Handle POST - image processing
  if (method === 'POST') {
    try {
      // Parse form data
      const formData = await request.formData();
      const files = formData.getAll('images'); // Changed to match form field name
      const url = formData.get('url');
      const format = formData.get('format') || 'webp';
      const quality = formData.get('quality') || '80';

      // Basic validation
      if (files.length === 0 && !url) {
        return new Response(JSON.stringify({ 
          error: 'No files or URL provided',
          received: {
            filesCount: files.length,
            hasUrl: !!url,
            formKeys: Array.from(formData.keys())
          }
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Mock processing results
      const results = [];
      
      // Process files
      for (const file of files) {
        if (file && file.size > 0) {
          results.push({
            name: file.name,
            originalSize: file.size,
            optimizedSize: Math.round(file.size * 0.7),
            savedBytes: Math.round(file.size * 0.3),
            savedPercentage: '30.0',
            format: format
          });
        }
      }

      // Process URL
      if (url) {
        results.push({
          name: 'Downloaded Image',
          originalSize: 150000,
          optimizedSize: 105000,
          savedBytes: 45000,
          savedPercentage: '30.0',
          format: format
        });
      }

      // Return HTML results page
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>✅ Success! - ImgPressor</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .success { color: #16a34a; font-size: 24px; margin-bottom: 20px; }
            .result { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .back-btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✅ Compression Successful!</h1>
            <p>Your images have been processed successfully. This is a test response to verify the endpoint is working.</p>
            
            ${results.map(result => `
              <div class="result">
                <h3>${result.name}</h3>
                <p>Original: ${(result.originalSize / 1024).toFixed(1)} KB</p>
                <p>Compressed: ${(result.optimizedSize / 1024).toFixed(1)} KB</p>
                <p><strong>Saved: ${(result.savedBytes / 1024).toFixed(1)} KB (${result.savedPercentage}%)</strong></p>
                <p>Format: ${result.format.toUpperCase()}</p>
              </div>
            `).join('')}
            
            <a href="/" class="back-btn">Back to Home</a>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Processing failed',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  // Method not supported
  return new Response(`Method ${method} not allowed`, {
    status: 405,
    headers: {
      ...corsHeaders,
      'Allow': 'GET, POST, OPTIONS'
    }
  });
}