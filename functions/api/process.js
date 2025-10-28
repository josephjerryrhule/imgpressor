// Cloudflare Pages Function using specific method exports
// This approach exports specific handlers for each HTTP method

export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'GET request to /process working!',
    endpoint: '/process',
    method: 'GET',
    timestamp: new Date().toISOString(),
    note: 'Function is deployed and working'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestPost(context) {
  const { request } = context;
  
  try {
    console.log('POST request received at /process');
    
    const formData = await request.formData();
    const files = formData.getAll('images');
    const url = formData.get('url');

    console.log('Form data received:', { filesCount: files.length, hasUrl: !!url });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>✅ POST Working! - ImgPressor</title>
        <style>
          body { font-family: Arial; padding: 20px; background: #f0f9ff; }
          .success { background: #dcfce7; border: 1px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .back-btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>🎉 SUCCESS! POST request working!</h1>
        <div class="success">
          <h2>Function properly handling POST requests</h2>
          <p><strong>Files received:</strong> ${files.length}</p>
          <p><strong>URL received:</strong> ${url || 'None'}</p>
          <p><strong>Endpoint:</strong> /process</p>
          <p><strong>Method:</strong> POST ✅</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Status:</strong> 405 error should be FIXED!</p>
        </div>
        <a href="/" class="back-btn">Back to Home</a>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('POST processing error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'POST processing failed',
      message: error.message,
      stack: error.stack,
      endpoint: '/process'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}