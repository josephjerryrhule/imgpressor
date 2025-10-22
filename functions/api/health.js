
export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'healthy',
    version: '2.3.0',
    platform: 'Cloudflare Pages',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
