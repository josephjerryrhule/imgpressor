// Simple hello world function to test if functions work at all

export async function onRequest() {
  return new Response(JSON.stringify({
    message: "Hello from Cloudflare Pages Functions!",
    timestamp: new Date().toISOString(),
    endpoint: "/hello",
    status: "working"
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}