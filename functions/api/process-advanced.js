// Advanced Cloudflare Pages Function with WebAssembly image processing
// This uses the squoosh library WebAssembly modules for image compression

import { ImagePool } from '@squoosh/lib/pool';

let imagePool;

// Initialize the image pool (this is expensive, so we do it once)
async function getImagePool() {
  if (!imagePool) {
    imagePool = new ImagePool();
  }
  return imagePool;
}

export async function onRequestPost(context) {
  const { request } = context;
  
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

    // Process single file
    if (files.length === 1 && !url) {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      
      const pool = await getImagePool();
      const image = pool.ingestImage(new Uint8Array(buffer));
      
      // Configure encoding options based on format
      const encodeOptions = {};
      if (format === 'webp') {
        encodeOptions.webp = { quality };
      } else if (format === 'avif') {
        encodeOptions.avif = { quality };
      } else if (format === 'mozjpeg') {
        encodeOptions.mozjpeg = { quality };
      } else if (format === 'oxipng') {
        encodeOptions.oxipng = {};
      }
      
      await image.encode(encodeOptions);
      
      const encodedImage = await image.encodedWith[format];
      
      return new Response(encodedImage.binary, {
        headers: {
          'Content-Type': `image/${format}`,
          'Content-Disposition': `attachment; filename="compressed.${format}"`,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // For multiple files or URL processing, return a placeholder
    return new Response(JSON.stringify({
      message: 'Multiple file processing requires additional setup',
      notice: 'This WebAssembly implementation supports single file processing',
      received: {
        fileCount: files.length,
        url: url,
        format: format,
        quality: quality
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Image processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Image processing failed',
      details: error.message 
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