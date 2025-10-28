// Debug function to test what's happening with requests

export async function onRequest(context) {
  const { request } = context;
  
  // Log everything about the request
  const debugInfo = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent') || 'unknown'
  };

  console.log('Debug info:', debugInfo);

  // Handle any method
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      const formEntries = {};
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          formEntries[key] = `File: ${value.name} (${value.size} bytes)`;
        } else {
          formEntries[key] = value;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'POST request received successfully!',
        method: request.method,
        formData: formEntries,
        debugInfo: debugInfo
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to process POST',
        message: error.message,
        method: request.method,
        debugInfo: debugInfo
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // For any other method (GET, OPTIONS, etc.)
  return new Response(JSON.stringify({
    message: 'Debug endpoint working',
    method: request.method,
    debugInfo: debugInfo,
    note: 'This endpoint accepts any HTTP method for testing'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}