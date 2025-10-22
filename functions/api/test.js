// Simple test function to verify Cloudflare Pages Functions are working

export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    message: 'Cloudflare Pages Functions are working!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    url: context.request.url
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
    // Try to parse form data
    const formData = await request.formData();
    const entries = {};
    
    for (const [key, value] of formData.entries()) {
      entries[key] = value instanceof File ? 
        `File: ${value.name} (${value.size} bytes)` : 
        value;
    }
    
    return new Response(JSON.stringify({
      message: 'POST request received successfully!',
      method: 'POST',
      timestamp: new Date().toISOString(),
      formData: entries,
      url: request.url
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to process POST request',
      details: error.message,
      timestamp: new Date().toISOString()
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
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}