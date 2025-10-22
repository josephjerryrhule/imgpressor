// Simple test function to verify Cloudflare Pages Functions are working

export async function onRequest(context) {
  const { request } = context;
  const method = request.method;

  return new Response(JSON.stringify({
    success: true,
    message: 'Cloudflare Pages Functions are working perfectly!',
    method: method,
    timestamp: new Date().toISOString(),
    url: request.url,
    note: 'If you see this, the Functions deployment is working correctly.'
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}