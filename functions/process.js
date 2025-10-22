// Direct function in functions root for testing
// This will be available at /process (not /api/process)

export async function onRequest(context) {
  const { request } = context;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (method === 'GET') {
    return new Response(JSON.stringify({
      message: 'Direct function working!',
      endpoint: '/process',
      method: method,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (method === 'POST') {
    try {
      const formData = await request.formData();
      const files = formData.getAll('images');
      const url = formData.get('url');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>✅ Working! - ImgPressor</title>
          <style>
            body { font-family: Arial; padding: 20px; background: #f0f9ff; }
            .success { background: #dcfce7; border: 1px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .back-btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>🎉 Success! Function is working!</h1>
          <div class="success">
            <h2>POST request received successfully</h2>
            <p><strong>Files received:</strong> ${files.length}</p>
            <p><strong>URL received:</strong> ${url || 'None'}</p>
            <p><strong>Endpoint:</strong> /process (direct function)</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
          <a href="/" class="back-btn">Back to Home</a>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        endpoint: '/process'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  return new Response(`Method ${method} not allowed`, {
    status: 405,
    headers: { ...corsHeaders, 'Allow': 'GET, POST, OPTIONS' }
  });
}