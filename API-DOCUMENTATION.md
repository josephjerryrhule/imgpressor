# ImgPressor API Documentation

Complete guide for integrating ImgPressor's image compression API into your applications.

## Base URL

```
http://localhost:3001
```

Replace with your production URL when deployed.

---

## API Endpoints

### 1. Upload Image (`/api/upload`)

Upload an image (file or URL) and receive metadata with a session ID for later conversion.

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data` or `application/json`

**Request Parameters (choose one):**
- `image` (file): Image file to upload
- `url` (string): Image URL to download and process

**Response:**
```json
{
  "success": true,
  "sessionId": "a1b2c3d4e5f6...",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpeg",
    "size": 524288,
    "hasAlpha": false
  },
  "preview": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "conversionOptions": ["webp", "avif", "jpeg", "png"]
}
```

---

### 2. Convert Image (`/api/convert`)

Convert a previously uploaded image to a specific format.

**Endpoint:** `POST /api/convert`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4e5f6...",
  "format": "webp",
  "quality": 80
}
```

**Parameters:**
- `sessionId` (string, required): Session ID from `/api/upload`
- `format` (string, required): Target format (`webp`, `avif`, `jpeg`, `png`)
- `quality` (number, optional): Compression quality 10-100 (default: 80)

**Response:**
```json
{
  "success": true,
  "format": "webp",
  "quality": 80,
  "preview": "data:image/webp;base64,UklGRiQAAABXRUJQVlA4...",
  "originalSize": 524288,
  "convertedSize": 156234,
  "savedBytes": 368054,
  "savedPercentage": "70.19"
}
```

---

### 3. Process Images (`/api/process`)

Single-step upload and compression (legacy endpoint).

**Endpoint:** `POST /api/process`

**Content-Type:** `multipart/form-data`

**Request Parameters:**
- `images` (file[], required): Up to 10 images
- `format` (string, optional): Target format (default: `webp`)
- `quality` (number, optional): Compression quality 10-100 (default: 80)

**Response:** Binary image data or HTML page (based on Accept header)

---

## Code Examples

### JavaScript (Fetch API)

#### Upload and Convert Workflow

```javascript
// Step 1a: Upload image file
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

// Step 1b: Upload image from URL (FormData)
async function uploadImageFromURL(imageUrl) {
  const formData = new FormData();
  formData.append('url', imageUrl);
  
  const response = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

// Step 1c: Upload image from URL (JSON)
async function uploadImageFromURLJson(imageUrl) {
  const response = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: imageUrl })
  });
  
  return await response.json();
}

// Step 2: Convert to desired format
async function convertImage(sessionId, format = 'webp', quality = 80) {
  const response = await fetch('http://localhost:3001/api/convert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sessionId, format, quality })
  });
  
  return await response.json();
}

// Complete workflow with file
async function compressImage(file) {
  try {
    // Upload
    const uploadResult = await uploadImage(file);
    console.log('Uploaded:', uploadResult.image);
    
    // Convert to WebP
    const convertResult = await convertImage(
      uploadResult.sessionId,
      'webp',
      85
    );
    
    console.log(`Saved ${convertResult.savedPercentage}%`);
    
    // Use the base64 preview
    document.getElementById('preview').src = convertResult.preview;
    
    return convertResult;
  } catch (error) {
    console.error('Compression failed:', error);
  }
}

// Complete workflow with URL
async function compressImageFromURL(imageUrl) {
  try {
    // Upload from URL
    const uploadResult = await uploadImageFromURLJson(imageUrl);
    console.log('Downloaded:', uploadResult.image);
    
    // Convert to WebP
    const convertResult = await convertImage(
      uploadResult.sessionId,
      'webp',
      85
    );
    
    console.log(`Saved ${convertResult.savedPercentage}%`);
    
    return convertResult;
  } catch (error) {
    console.error('Compression failed:', error);
  }
}

// Usage with file upload
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  compressImage(file);
});

// Usage with URL
compressImageFromURL('https://example.com/large-image.jpg');
```

---

### Node.js (axios)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function compressImageFile(filePath, format = 'webp', quality = 80) {
  try {
    // Step 1: Upload file
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath));
    
    const uploadResponse = await axios.post(
      'http://localhost:3001/api/upload',
      formData,
      {
        headers: formData.getHeaders()
      }
    );
    
    const { sessionId, image } = uploadResponse.data;
    console.log(`Uploaded: ${image.width}x${image.height} ${image.originalFormat}`);
    
    // Step 2: Convert
    const convertResponse = await axios.post(
      'http://localhost:3001/api/convert',
      {
        sessionId,
        format,
        quality
      }
    );
    
    const result = convertResponse.data;
    console.log(`Compressed: ${result.savedPercentage}% reduction`);
    
    // Save the base64 image
    const base64Data = result.preview.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(`output.${format}`, buffer);
    
    return result;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function compressImageURL(imageUrl, format = 'webp', quality = 80) {
  try {
    // Step 1: Upload from URL
    const uploadResponse = await axios.post(
      'http://localhost:3001/api/upload',
      { url: imageUrl }
    );
    
    const { sessionId, image } = uploadResponse.data;
    console.log(`Downloaded: ${image.width}x${image.height} ${image.originalFormat}`);
    
    // Step 2: Convert
    const convertResponse = await axios.post(
      'http://localhost:3001/api/convert',
      {
        sessionId,
        format,
        quality
      }
    );
    
    const result = convertResponse.data;
    console.log(`Compressed: ${result.savedPercentage}% reduction`);
    
    // Save the base64 image
    const base64Data = result.preview.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(`output.${format}`, buffer);
    
    return result;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Usage - Local file
compressImageFile('./input.jpg', 'webp', 85);

// Usage - URL
compressImageURL('https://example.com/large-image.jpg', 'webp', 85);
```

---

### Python (requests)

```python
import requests
import base64

def compress_image_file(file_path, format='webp', quality=80):
    """Compress image from local file"""
    base_url = 'http://localhost:3001'
    
    # Step 1: Upload
    with open(file_path, 'rb') as f:
        files = {'image': f}
        upload_response = requests.post(
            f'{base_url}/api/upload',
            files=files
        )
    
    upload_data = upload_response.json()
    session_id = upload_data['sessionId']
    image_info = upload_data['image']
    
    print(f"Uploaded: {image_info['width']}x{image_info['height']} {image_info['originalFormat']}")
    
    # Step 2: Convert
    convert_response = requests.post(
        f'{base_url}/api/convert',
        json={
            'sessionId': session_id,
            'format': format,
            'quality': quality
        }
    )
    
    result = convert_response.json()
    print(f"Compressed: {result['savedPercentage']}% reduction")
    
    # Save the base64 image
    preview_data = result['preview'].split(',')[1]
    image_data = base64.b64decode(preview_data)
    
    with open(f'output.{format}', 'wb') as f:
        f.write(image_data)
    
    return result

def compress_image_url(image_url, format='webp', quality=80):
    """Compress image from URL"""
    base_url = 'http://localhost:3001'
    
    # Step 1: Upload from URL
    upload_response = requests.post(
        f'{base_url}/api/upload',
        json={'url': image_url}
    )
    
    upload_data = upload_response.json()
    session_id = upload_data['sessionId']
    image_info = upload_data['image']
    
    print(f"Downloaded: {image_info['width']}x{image_info['height']} {image_info['originalFormat']}")
    
    # Step 2: Convert
    convert_response = requests.post(
        f'{base_url}/api/convert',
        json={
            'sessionId': session_id,
            'format': format,
            'quality': quality
        }
    )
    
    result = convert_response.json()
    print(f"Compressed: {result['savedPercentage']}% reduction")
    
    # Save the base64 image
    preview_data = result['preview'].split(',')[1]
    image_data = base64.b64decode(preview_data)
    
    with open(f'output.{format}', 'wb') as f:
        f.write(image_data)
    
    return result

# Usage - Local file
compress_image_file('input.jpg', format='webp', quality=85)

# Usage - URL
compress_image_url('https://example.com/large-image.jpg', format='webp', quality=85)
```

---

### PHP (cURL)

```php
<?php

function compressImage($filePath, $format = 'webp', $quality = 80) {
    $baseUrl = 'http://localhost:3001';
    
    // Step 1: Upload
    $uploadCurl = curl_init();
    $cFile = new CURLFile($filePath);
    
    curl_setopt_array($uploadCurl, [
        CURLOPT_URL => "$baseUrl/api/upload",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => ['image' => $cFile],
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $uploadResponse = curl_exec($uploadCurl);
    curl_close($uploadCurl);
    
    $uploadData = json_decode($uploadResponse, true);
    $sessionId = $uploadData['sessionId'];
    $metadata = $uploadData['metadata'];
    
    echo "Uploaded: {$metadata['width']}x{$metadata['height']} {$metadata['format']}\n";
    
    // Step 2: Convert
    $convertCurl = curl_init();
    
    curl_setopt_array($convertCurl, [
        CURLOPT_URL => "$baseUrl/api/convert",
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'sessionId' => $sessionId,
            'format' => $format,
            'quality' => $quality
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true
    ]);
    
    $convertResponse = curl_exec($convertCurl);
    curl_close($convertCurl);
    
    $result = json_decode($convertResponse, true);
    echo "Compressed: {$result['savedPercentage']}% reduction\n";
    
    // Save the base64 image
    $previewData = explode(',', $result['preview'])[1];
    $imageData = base64_decode($previewData);
    file_put_contents("output.$format", $imageData);
    
    return $result;
}

// Usage
compressImage('input.jpg', 'webp', 85);
?>
```

---

### Go

```go
package main

import (
    "bytes"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "strings"
)

type UploadResponse struct {
    Success           bool              `json:"success"`
    SessionID         string            `json:"sessionId"`
    Metadata          map[string]interface{} `json:"metadata"`
    Preview           string            `json:"preview"`
    ConversionOptions []string          `json:"conversionOptions"`
}

type ConvertResponse struct {
    Success         bool    `json:"success"`
    Format          string  `json:"format"`
    Quality         int     `json:"quality"`
    Preview         string  `json:"preview"`
    OriginalSize    int     `json:"originalSize"`
    ConvertedSize   int     `json:"convertedSize"`
    SavedBytes      int     `json:"savedBytes"`
    SavedPercentage string  `json:"savedPercentage"`
}

func compressImage(filePath, format string, quality int) error {
    baseURL := "http://localhost:3001"
    
    // Step 1: Upload
    file, err := os.Open(filePath)
    if err != nil {
        return err
    }
    defer file.Close()
    
    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    part, err := writer.CreateFormFile("image", filePath)
    if err != nil {
        return err
    }
    
    io.Copy(part, file)
    writer.Close()
    
    uploadReq, _ := http.NewRequest("POST", baseURL+"/api/upload", body)
    uploadReq.Header.Set("Content-Type", writer.FormDataContentType())
    
    client := &http.Client{}
    uploadResp, err := client.Do(uploadReq)
    if err != nil {
        return err
    }
    defer uploadResp.Body.Close()
    
    var uploadData UploadResponse
    json.NewDecoder(uploadResp.Body).Decode(&uploadData)
    
    fmt.Printf("Uploaded: %.0fx%.0f %s\n", 
        uploadData.Metadata["width"], 
        uploadData.Metadata["height"],
        uploadData.Metadata["format"])
    
    // Step 2: Convert
    convertPayload, _ := json.Marshal(map[string]interface{}{
        "sessionId": uploadData.SessionID,
        "format":    format,
        "quality":   quality,
    })
    
    convertReq, _ := http.NewRequest("POST", 
        baseURL+"/api/convert",
        bytes.NewBuffer(convertPayload))
    convertReq.Header.Set("Content-Type", "application/json")
    
    convertResp, err := client.Do(convertReq)
    if err != nil {
        return err
    }
    defer convertResp.Body.Close()
    
    var result ConvertResponse
    json.NewDecoder(convertResp.Body).Decode(&result)
    
    fmt.Printf("Compressed: %s%% reduction\n", result.SavedPercentage)
    
    // Save the base64 image
    parts := strings.Split(result.Preview, ",")
    imageData, _ := base64.StdEncoding.DecodeString(parts[1])
    os.WriteFile(fmt.Sprintf("output.%s", format), imageData, 0644)
    
    return nil
}

func main() {
    compressImage("input.jpg", "webp", 85)
}
```

---

### Ruby

```ruby
require 'net/http'
require 'json'
require 'base64'

def compress_image(file_path, format = 'webp', quality = 80)
  base_url = 'http://localhost:3001'
  
  # Step 1: Upload
  uri = URI("#{base_url}/api/upload")
  request = Net::HTTP::Post.new(uri)
  
  form_data = [['image', File.open(file_path)]]
  request.set_form(form_data, 'multipart/form-data')
  
  response = Net::HTTP.start(uri.hostname, uri.port) do |http|
    http.request(request)
  end
  
  upload_data = JSON.parse(response.body)
  session_id = upload_data['sessionId']
  metadata = upload_data['metadata']
  
  puts "Uploaded: #{metadata['width']}x#{metadata['height']} #{metadata['format']}"
  
  # Step 2: Convert
  uri = URI("#{base_url}/api/convert")
  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request.body = JSON.dump({
    sessionId: session_id,
    format: format,
    quality: quality
  })
  
  response = Net::HTTP.start(uri.hostname, uri.port) do |http|
    http.request(request)
  end
  
  result = JSON.parse(response.body)
  puts "Compressed: #{result['savedPercentage']}% reduction"
  
  # Save the base64 image
  preview_data = result['preview'].split(',')[1]
  image_data = Base64.decode64(preview_data)
  File.write("output.#{format}", image_data)
  
  result
end

# Usage
compress_image('input.jpg', 'webp', 85)
```

---

### Java (OkHttp)

```java
import okhttp3.*;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Base64;

public class ImageCompressor {
    private static final String BASE_URL = "http://localhost:3001";
    private static final OkHttpClient client = new OkHttpClient();
    
    public static void compressImage(String filePath, String format, int quality) throws Exception {
        // Step 1: Upload
        File file = new File(filePath);
        RequestBody fileBody = RequestBody.create(file, MediaType.parse("image/*"));
        
        RequestBody uploadBody = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("image", file.getName(), fileBody)
            .build();
        
        Request uploadRequest = new Request.Builder()
            .url(BASE_URL + "/api/upload")
            .post(uploadBody)
            .build();
        
        Response uploadResponse = client.newCall(uploadRequest).execute();
        JSONObject uploadData = new JSONObject(uploadResponse.body().string());
        
        String sessionId = uploadData.getString("sessionId");
        JSONObject metadata = uploadData.getJSONObject("metadata");
        
        System.out.printf("Uploaded: %dx%d %s%n",
            metadata.getInt("width"),
            metadata.getInt("height"),
            metadata.getString("format"));
        
        // Step 2: Convert
        JSONObject convertPayload = new JSONObject();
        convertPayload.put("sessionId", sessionId);
        convertPayload.put("format", format);
        convertPayload.put("quality", quality);
        
        RequestBody convertBody = RequestBody.create(
            convertPayload.toString(),
            MediaType.parse("application/json"));
        
        Request convertRequest = new Request.Builder()
            .url(BASE_URL + "/api/convert")
            .post(convertBody)
            .build();
        
        Response convertResponse = client.newCall(convertRequest).execute();
        JSONObject result = new JSONObject(convertResponse.body().string());
        
        System.out.printf("Compressed: %s%% reduction%n",
            result.getString("savedPercentage"));
        
        // Save the base64 image
        String preview = result.getString("preview");
        String base64Data = preview.split(",")[1];
        byte[] imageData = Base64.getDecoder().decode(base64Data);
        
        try (FileOutputStream fos = new FileOutputStream("output." + format)) {
            fos.write(imageData);
        }
    }
    
    public static void main(String[] args) throws Exception {
        compressImage("input.jpg", "webp", 85);
    }
}
```

---

### C# (.NET)

```csharp
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class ImageCompressor
{
    private static readonly HttpClient client = new HttpClient();
    private const string BaseUrl = "http://localhost:3001";
    
    public static async Task CompressImage(string filePath, string format = "webp", int quality = 80)
    {
        // Step 1: Upload
        using var formData = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(File.ReadAllBytes(filePath));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/*");
        formData.Add(fileContent, "image", Path.GetFileName(filePath));
        
        var uploadResponse = await client.PostAsync($"{BaseUrl}/api/upload", formData);
        var uploadJson = await uploadResponse.Content.ReadAsStringAsync();
        var uploadData = JsonDocument.Parse(uploadJson);
        
        var sessionId = uploadData.RootElement.GetProperty("sessionId").GetString();
        var metadata = uploadData.RootElement.GetProperty("metadata");
        
        Console.WriteLine($"Uploaded: {metadata.GetProperty("width")}x{metadata.GetProperty("height")} {metadata.GetProperty("format")}");
        
        // Step 2: Convert
        var convertPayload = new
        {
            sessionId = sessionId,
            format = format,
            quality = quality
        };
        
        var convertContent = new StringContent(
            JsonSerializer.Serialize(convertPayload),
            Encoding.UTF8,
            "application/json");
        
        var convertResponse = await client.PostAsync($"{BaseUrl}/api/convert", convertContent);
        var resultJson = await convertResponse.Content.ReadAsStringAsync();
        var result = JsonDocument.Parse(resultJson);
        
        Console.WriteLine($"Compressed: {result.RootElement.GetProperty("savedPercentage")}% reduction");
        
        // Save the base64 image
        var preview = result.RootElement.GetProperty("preview").GetString();
        var base64Data = preview.Split(',')[1];
        var imageData = Convert.FromBase64String(base64Data);
        
        await File.WriteAllBytesAsync($"output.{format}", imageData);
    }
    
    static async Task Main(string[] args)
    {
        await CompressImage("input.jpg", "webp", 85);
    }
}
```

---

## Response Formats

### Success Response

All successful API calls return JSON with `success: true`:

```json
{
  "success": true,
  "...": "additional data"
}
```

### Error Response

Errors return appropriate HTTP status codes with error details:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters, invalid format)
- `404` - Session not found or expired
- `500` - Internal Server Error

---

## Input Methods

The API supports two ways to provide images:

### 1. File Upload
Upload an image file directly from your local system using `multipart/form-data`.

**Pros:**
- Direct file transfer
- No external dependencies
- Works with any file

**Example:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
```

### 2. Image URL
Provide a URL to an image hosted online. The server will download and process it.

**Pros:**
- No need to upload large files
- Perfect for processing images already online
- Reduces bandwidth on client side

**Example:**
```javascript
// FormData method
const formData = new FormData();
formData.append('url', 'https://example.com/image.jpg');

// JSON method
fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/image.jpg' })
});
```

**Note:** When using URLs, ensure:
- The URL is publicly accessible
- The image URL returns proper CORS headers (if calling from browser)
- The URL points directly to an image file

---

## Supported Formats

- **WebP** - Modern format with excellent compression (recommended)
- **AVIF** - Next-gen format with superior compression
- **JPEG** - Universal compatibility
- **PNG** - Lossless compression with transparency

---

## Quality Guidelines

- **90-100**: Maximum quality, minimal compression
- **80-89**: High quality, good compression (recommended)
- **70-79**: Medium quality, better compression
- **50-69**: Lower quality, high compression
- **10-49**: Lowest quality, maximum compression

---

## Session Management

- Sessions expire after **10 minutes**
- Each upload creates a unique session ID
- Session IDs are single-use (one conversion per upload)
- For multiple format conversions, upload multiple times

---

## Rate Limiting

Currently no rate limits. Consider implementing rate limiting in production:
- Use middleware like `express-rate-limit`
- Recommend: 100 requests per 15 minutes per IP

---

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Validation**: Validate image formats before upload
3. **File Size**: Keep uploads under 100MB (server limit)
4. **Session Storage**: Don't store session IDs permanently
5. **Format Selection**: Use WebP for web, AVIF for cutting-edge, JPEG for compatibility
6. **Quality Settings**: Start with 80-85 for balanced quality/size
7. **Base64 Usage**: For display only; decode and save for production files

---

## Example Frontend Integration

### React Component

```jsx
import React, { useState } from 'react';

function ImageCompressor() {
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'url'
  
  async function handleCompress(source, format = 'webp', quality = 85) {
    setLoading(true);
    
    try {
      // Upload (file or URL)
      const formData = new FormData();
      
      if (inputMode === 'file') {
        formData.append('image', source);
      } else {
        formData.append('url', source);
      }
      
      const uploadRes = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        alert(uploadData.error);
        return;
      }
      
      // Convert
      const convertRes = await fetch('http://localhost:3001/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadData.sessionId,
          format,
          quality
        })
      });
      const result = await convertRes.json();
      
      setPreview(result.preview);
      setStats({
        original: (result.originalSize / 1024).toFixed(2),
        compressed: (result.convertedSize / 1024).toFixed(2),
        saved: result.savedPercentage
      });
    } catch (error) {
      console.error('Compression failed:', error);
      alert('Compression failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div>
      {/* Input mode selector */}
      <div>
        <button onClick={() => setInputMode('file')}>
          Upload File
        </button>
        <button onClick={() => setInputMode('url')}>
          Use URL
        </button>
      </div>
      
      {/* File upload */}
      {inputMode === 'file' && (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleCompress(e.target.files[0])}
          disabled={loading}
        />
      )}
      
      {/* URL input */}
      {inputMode === 'url' && (
        <div>
          <input
            type="text"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={loading}
          />
          <button 
            onClick={() => handleCompress(imageUrl)}
            disabled={loading || !imageUrl}
          >
            Compress from URL
          </button>
        </div>
      )}
      
      {loading && <p>Compressing...</p>}
      
      {preview && (
        <div>
          <img src={preview} alt="Compressed" />
          <p>Original: {stats.original} KB</p>
          <p>Compressed: {stats.compressed} KB</p>
          <p>Saved: {stats.saved}%</p>
        </div>
      )}
    </div>
  );
}

export default ImageCompressor;
```

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify image formats are supported
- Ensure session IDs haven't expired (10 min limit)
- Contact support with request/response data for debugging

---

## Changelog

### v1.0.0 (Current)
- Initial API release
- Upload and convert endpoints
- Support for WebP, AVIF, JPEG, PNG
- Base64 preview generation
- Session-based workflow
