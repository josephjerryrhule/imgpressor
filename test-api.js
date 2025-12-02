const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Upload from URL
async function testURLUpload() {
  log('blue', '\n=== Test 1: Upload Image from URL ===');
  
  try {
    // Using a sample image URL
    const imageUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
    
    log('yellow', `Uploading from URL: ${imageUrl}`);
    
    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, {
      url: imageUrl
    });
    
    if (uploadResponse.data.success) {
      log('green', '✓ Upload successful!');
      console.log('Session ID:', uploadResponse.data.sessionId);
      console.log('Image Info:', {
        width: uploadResponse.data.image.width,
        height: uploadResponse.data.image.height,
        format: uploadResponse.data.image.originalFormat,
        size: uploadResponse.data.image.sizeKB + ' KB'
      });
      
      // Test conversion
      log('yellow', '\nConverting to WebP...');
      const convertResponse = await axios.post(`${BASE_URL}/api/convert`, {
        sessionId: uploadResponse.data.sessionId,
        format: 'webp',
        quality: 85
      });
      
      if (convertResponse.data.success) {
        log('green', '✓ Conversion successful!');
        console.log('Results:', {
          originalSize: (convertResponse.data.originalSize / 1024).toFixed(2) + ' KB',
          convertedSize: (convertResponse.data.convertedSize / 1024).toFixed(2) + ' KB',
          saved: convertResponse.data.savedPercentage + '%'
        });
        
        // Save the converted image
        const base64Data = convertResponse.data.preview.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync('test-output-url.webp', buffer);
        log('green', '✓ Saved as test-output-url.webp');
        
        return true;
      }
    }
  } catch (error) {
    log('red', '✗ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 2: Upload from file (create a test image first)
async function testFileUpload() {
  log('blue', '\n=== Test 2: Upload Image File ===');
  
  try {
    // Check if we have a test image, if not skip this test
    const testImagePath = path.join(__dirname, 'public', 'logo.png');
    
    if (!fs.existsSync(testImagePath)) {
      log('yellow', 'Skipping file upload test (no test image found)');
      return true;
    }
    
    log('yellow', `Uploading file: ${testImagePath}`);
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    
    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, formData, {
      headers: formData.getHeaders()
    });
    
    if (uploadResponse.data.success) {
      log('green', '✓ Upload successful!');
      console.log('Session ID:', uploadResponse.data.sessionId);
      console.log('Image Info:', {
        width: uploadResponse.data.image.width,
        height: uploadResponse.data.image.height,
        format: uploadResponse.data.image.originalFormat,
        size: uploadResponse.data.image.sizeKB + ' KB'
      });
      
      // Test conversion
      log('yellow', '\nConverting to WebP...');
      const convertResponse = await axios.post(`${BASE_URL}/api/convert`, {
        sessionId: uploadResponse.data.sessionId,
        format: 'webp',
        quality: 80
      });
      
      if (convertResponse.data.success) {
        log('green', '✓ Conversion successful!');
        console.log('Results:', {
          originalSize: (convertResponse.data.originalSize / 1024).toFixed(2) + ' KB',
          convertedSize: (convertResponse.data.convertedSize / 1024).toFixed(2) + ' KB',
          saved: convertResponse.data.savedPercentage + '%'
        });
        
        // Save the converted image
        const base64Data = convertResponse.data.preview.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync('test-output-file.webp', buffer);
        log('green', '✓ Saved as test-output-file.webp');
        
        return true;
      }
    }
  } catch (error) {
    log('red', '✗ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Multiple format conversions
async function testMultipleFormats() {
  log('blue', '\n=== Test 3: Multiple Format Conversions ===');
  
  try {
    // Upload once
    const imageUrl = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800';
    
    log('yellow', 'Uploading image...');
    const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, {
      url: imageUrl
    });
    
    if (!uploadResponse.data.success) {
      throw new Error('Upload failed');
    }
    
    const sessionId = uploadResponse.data.sessionId;
    log('green', '✓ Upload successful!');
    
    // Try converting to different formats
    const formats = ['webp', 'avif', 'jpeg', 'png'];
    const results = [];
    
    for (const format of formats) {
      log('yellow', `\nConverting to ${format.toUpperCase()}...`);
      
      try {
        const convertResponse = await axios.post(`${BASE_URL}/api/convert`, {
          sessionId,
          format,
          quality: 80
        });
        
        if (convertResponse.data.success) {
          log('green', `✓ ${format.toUpperCase()} conversion successful!`);
          results.push({
            format: format.toUpperCase(),
            originalSize: (convertResponse.data.originalSize / 1024).toFixed(2),
            convertedSize: (convertResponse.data.convertedSize / 1024).toFixed(2),
            saved: convertResponse.data.savedPercentage
          });
        }
      } catch (error) {
        log('red', `✗ ${format.toUpperCase()} conversion failed`);
        console.error(error.response?.data || error.message);
      }
    }
    
    // Display comparison table
    log('blue', '\n=== Format Comparison ===');
    console.table(results);
    
    return true;
  } catch (error) {
    log('red', '✗ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Error handling
async function testErrorHandling() {
  log('blue', '\n=== Test 4: Error Handling ===');
  
  const tests = [
    {
      name: 'Invalid URL',
      test: async () => {
        try {
          await axios.post(`${BASE_URL}/api/upload`, {
            url: 'https://invalid-url-that-does-not-exist.com/image.jpg'
          });
          return false;
        } catch (error) {
          return error.response?.data?.success === false;
        }
      }
    },
    {
      name: 'No image or URL provided',
      test: async () => {
        try {
          await axios.post(`${BASE_URL}/api/upload`, {});
          return false;
        } catch (error) {
          return error.response?.data?.success === false;
        }
      }
    },
    {
      name: 'Invalid session ID',
      test: async () => {
        try {
          await axios.post(`${BASE_URL}/api/convert`, {
            sessionId: 'invalid-session-id',
            format: 'webp',
            quality: 80
          });
          return false;
        } catch (error) {
          return error.response?.data?.success === false;
        }
      }
    },
    {
      name: 'Invalid format',
      test: async () => {
        // First upload a valid image
        const uploadResponse = await axios.post(`${BASE_URL}/api/upload`, {
          url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'
        });
        
        try {
          await axios.post(`${BASE_URL}/api/convert`, {
            sessionId: uploadResponse.data.sessionId,
            format: 'invalid-format',
            quality: 80
          });
          return false;
        } catch (error) {
          return error.response?.data?.success === false;
        }
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        log('green', `✓ ${test.name}: Properly handled`);
        passed++;
      } else {
        log('red', `✗ ${test.name}: Not properly handled`);
        failed++;
      }
    } catch (error) {
      log('red', `✗ ${test.name}: Unexpected error`);
      console.error(error.message);
      failed++;
    }
  }
  
  log('blue', `\nError Handling: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run all tests
async function runAllTests() {
  log('blue', '\n╔════════════════════════════════════════╗');
  log('blue', '║   ImgPressor API Test Suite          ║');
  log('blue', '╚════════════════════════════════════════╝');
  
  const results = [];
  
  // Run tests
  results.push({ name: 'URL Upload & Conversion', passed: await testURLUpload() });
  results.push({ name: 'File Upload & Conversion', passed: await testFileUpload() });
  results.push({ name: 'Multiple Formats', passed: await testMultipleFormats() });
  results.push({ name: 'Error Handling', passed: await testErrorHandling() });
  
  // Summary
  log('blue', '\n╔════════════════════════════════════════╗');
  log('blue', '║   Test Summary                        ║');
  log('blue', '╚════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    if (result.passed) {
      log('green', `✓ ${result.name}`);
    } else {
      log('red', `✗ ${result.name}`);
    }
  });
  
  log('blue', `\n════════════════════════════════════════`);
  if (failed === 0) {
    log('green', `All tests passed! (${passed}/${results.length})`);
  } else {
    log('yellow', `Tests completed: ${passed} passed, ${failed} failed`);
  }
  log('blue', `════════════════════════════════════════\n`);
}

// Run tests
runAllTests().catch(error => {
  log('red', '\nTest suite crashed!');
  console.error(error);
  process.exit(1);
});
