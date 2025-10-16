const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

// Multer setup for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.url.includes('/process')) {
        console.log('Process request - Headers:', Object.keys(req.headers));
        console.log('Content-Type:', req.headers['content-type']);
    }
    next();
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper function to download image
async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Image-Compressor-App/1.0'
            }
        });

        // Check if response is an image
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('The provided URL does not point to a valid image.');
        }

        return Buffer.from(response.data);
    } catch (error) {
        if (error.response) {
            throw new Error(`Failed to download image: ${error.response.status} ${error.response.statusText}`);
        } else if (error.code === 'ENOTFOUND') {
            throw new Error('Invalid URL or unable to reach the server.');
        } else {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

// Helper function to optimize image
async function optimizeImage(buffer, quality = 80) {
    try {
        // Get metadata
        const metadata = await sharp(buffer).metadata();
        
        // Calculate new height (original / 1.5)
        const newHeight = Math.round(metadata.height / 1.5);
        
        // Resize and convert to WebP
        const optimizedBuffer = await sharp(buffer)
            .resize({ height: newHeight, withoutEnlargement: true })
            .webp({ quality: parseInt(quality) })
            .toBuffer();
        
        return optimizedBuffer;
    } catch (error) {
        throw new Error(`Image optimization failed: ${error.message}`);
    }
}

// Helper function to save buffer
function saveBuffer(buffer, originalFilename, ext = 'webp') {
    // Extract name without extension and add new extension
    const nameWithoutExt = path.parse(originalFilename).name;
    const filename = `${nameWithoutExt}.${ext}`;
    const filepath = path.join(__dirname, 'public', 'optimized', filename);
    
    fs.writeFileSync(filepath, buffer);
    return filename;
}// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Debug route to check if server is responding
app.get('/test', (req, res) => {
    res.json({ 
        status: 'Server is working',
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        port: PORT,
        routes: [
            'GET /',
            'POST /process',
            'GET /health',
            'GET /download-all/:sessionId'
        ]
    });
});

// Simple test form for POST /process
app.get('/test-form', (req, res) => {
    res.send(`
        <html>
        <body>
            <h1>Test Form for /process endpoint</h1>
            <form action="/process" method="POST" enctype="multipart/form-data">
                <p>Test URL: <input type="url" name="url" value="https://picsum.photos/400/300" /></p>
                <p>Quality: <input type="number" name="quality" value="80" min="10" max="100" /></p>
                <button type="submit">Test Process</button>
            </form>
            <br>
            <a href="/">Back to main app</a>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('./package.json').version
    });
});

app.post('/process', upload.array('images', 10), async (req, res) => {
    console.log('POST /process - Request received');
    console.log('Files:', req.files ? req.files.length : 0);
    console.log('Body URL:', req.body.url || 'none');
    
    try {
        const quality = req.body.quality || 80;
        let results = [];
        
        if (req.files && req.files.length > 0) {
            // Process uploaded files
            for (const file of req.files) {
                const result = await processImage(file.buffer, file.originalname, quality);
                results.push(result);
            }
        } else if (req.body.url) {
            // Process URL
            const originalBuffer = await downloadImage(req.body.url);
            const result = await processImage(originalBuffer, 'url_image.jpg', quality, req.body.url);
            results.push(result);
        } else {
            return res.status(400).send('<h1>Error: Please provide images or a URL.</h1><a href="/">Go back</a>');
        }
        
        // Generate result page
        const resultItems = results.map(result => `
            <div class="bg-white p-4 rounded-lg shadow-md">
                <h3 class="text-lg font-semibold mb-4 text-gray-700">${result.name}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Original</p>
                        <img src="${result.originalPreview}" alt="Original" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(result.originalSize / 1024).toFixed(2)} KB</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600 mb-2">Optimized (WebP)</p>
                        <img src="/optimized/${result.optimizedFilename}" alt="Optimized" class="w-full h-32 object-cover rounded-lg">
                        <p class="text-xs text-gray-500 mt-1">${(result.optimizedSize / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
                <p class="text-sm text-green-600 font-medium">Saved: ${(result.savedBytes / 1024).toFixed(2)} KB (${result.savedPercentage}%)</p>
                <a href="/optimized/${result.optimizedFilename}" download class="mt-2 inline-block btn-success text-sm py-2 px-4">
                    Download
                </a>
            </div>
        `).join('');
        
        const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
        const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
        const totalPercentage = ((totalSaved / totalOriginal) * 100).toFixed(2);
        
        // Create session ID for download all functionality
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        // Store results in temporary file for download all
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        fs.writeFileSync(path.join(tempDir, `${sessionId}.json`), JSON.stringify(results));
        
        // Download all button (only show if more than one image)
        const downloadAllButton = results.length > 1 ? `
            <a href="/download-all/${sessionId}" class="btn-purple inline-block mr-4 py-2 px-6">
                Download All as ZIP
            </a>
        ` : '';
        
        const resultHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Compression Results</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body class="bg-gray-100 min-h-screen py-8">
                <div class="max-w-6xl mx-auto px-4">
                    <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Images Compressed Successfully!</h1>
                    
                    <div class="bg-white p-6 rounded-lg shadow-md text-center mb-8">
                        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Total Results</h2>
                        <p class="text-lg"><strong>Total Space Saved:</strong> ${(totalSaved / 1024).toFixed(2)} KB</p>
                        <p class="text-lg"><strong>Average Savings:</strong> ${totalPercentage}%</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        ${resultItems}
                    </div>
                    
                    <div class="text-center">
                        ${downloadAllButton}
                        <a href="/" class="btn-primary inline-block py-2 px-6">
                            Compress More Images
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        res.send(resultHtml);
        
    } catch (error) {
        console.error(error);
        res.status(500).send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
    }
});

// Download all route
app.get('/download-all/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const tempFilePath = path.join(__dirname, 'temp', `${sessionId}.json`);
        
        // Check if session file exists
        if (!fs.existsSync(tempFilePath)) {
            return res.status(404).send('<h1>Session expired or invalid</h1><a href="/">Go back</a>');
        }
        
        // Read results from temp file
        const results = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
        
        // Set response headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="compressed-images.zip"');
        
        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Best compression
        });
        
        // Handle archive errors
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).send('Error creating archive');
        });
        
        // Pipe archive to response
        archive.pipe(res);
        
        // Add each optimized image to the archive
        for (const result of results) {
            const filePath = path.join(__dirname, 'public', 'optimized', result.optimizedFilename);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: result.optimizedFilename });
            }
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Clean up temp file after a delay (optional)
        setTimeout(() => {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        }, 60000); // Delete after 1 minute
        
    } catch (error) {
        console.error('Download all error:', error);
        res.status(500).send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
    }
});

// Helper function to process a single image
async function processImage(buffer, filename, quality, url = null) {
    const originalSize = buffer.length;
    
    // Optimize image
    const optimizedBuffer = await optimizeImage(buffer, quality);
    const optimizedSize = optimizedBuffer.length;
    
    // Save optimized image with original name but .webp extension
    const optimizedFilename = saveBuffer(optimizedBuffer, filename, 'webp');
    
    // Save original for preview if from upload
    let originalPreview;
    if (url) {
        originalPreview = url;
    } else {
        const ext = path.extname(filename).slice(1) || 'jpg';
        const originalFilename = saveBuffer(buffer, filename, ext);
        originalPreview = `/optimized/${originalFilename}`;
    }
    
    // Calculate savings
    const savedBytes = originalSize - optimizedSize;
    const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(2);
    
    return {
        name: filename,
        originalPreview,
        optimizedFilename,
        originalSize,
        optimizedSize,
        savedBytes,
        savedPercentage
    };
}

// Error handling middleware
app.use((req, res, next) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).send(`
        <h1>404 - Route Not Found</h1>
        <p>The requested route <strong>${req.method} ${req.url}</strong> was not found.</p>
        <p>Available routes:</p>
        <ul>
            <li>GET / - Main page</li>
            <li>POST /process - Image processing</li>
            <li>GET /health - Health check</li>
            <li>GET /test - Server test</li>
            <li>GET /download-all/:sessionId - Download all files</li>
        </ul>
        <a href="/">Go back to home</a>
    `);
});

// Error handling for server errors
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send(`
        <h1>500 - Internal Server Error</h1>
        <p>Error: ${err.message}</p>
        <a href="/">Go back to home</a>
    `);
});

// Cleanup function
function cleanupFiles() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const sixHours = 6 * oneHour; // 6 hours
    
    // Clean temp directory (1 hour old files)
    try {
        const tempDir = path.join(__dirname, 'temp');
        if (fs.existsSync(tempDir)) {
            const tempFiles = fs.readdirSync(tempDir);
            tempFiles.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtime.getTime() > oneHour) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 Cleaned temp file: ${file}`);
                }
            });
        }
    } catch (error) {
        console.error('Error cleaning temp directory:', error.message);
    }
    
    // Clean optimized directory (6 hour old files)
    try {
        const optimizedDir = path.join(__dirname, 'public', 'optimized');
        if (fs.existsSync(optimizedDir)) {
            function cleanDirectory(dir) {
                const items = fs.readdirSync(dir);
                items.forEach(item => {
                    const itemPath = path.join(dir, item);
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        cleanDirectory(itemPath); // Recursively clean subdirectories
                        // Remove empty directories
                        try {
                            if (fs.readdirSync(itemPath).length === 0) {
                                fs.rmdirSync(itemPath);
                                console.log(`🧹 Removed empty directory: ${item}`);
                            }
                        } catch (e) {}
                    } else if (now - stats.mtime.getTime() > sixHours) {
                        fs.unlinkSync(itemPath);
                        console.log(`🧹 Cleaned optimized file: ${item}`);
                    }
                });
            }
            cleanDirectory(optimizedDir);
        }
    } catch (error) {
        console.error('Error cleaning optimized directory:', error.message);
    }
}

// Storage monitoring utilities
const { execSync } = require('child_process');

class StorageMonitor {
    static getDiskUsage() {
        try {
            const output = execSync('df -h /home/forge/pressor.themewire.co', { encoding: 'utf8' });
            const lines = output.trim().split('\n');
            const dataLine = lines[1].split(/\s+/);
            
            return {
                total: dataLine[1],
                used: dataLine[2],
                available: dataLine[3],
                percentage: parseInt(dataLine[4].replace('%', ''))
            };
        } catch (error) {
            console.error('Error getting disk usage:', error.message);
            return null;
        }
    }
    
    static getDirectorySize(dirPath) {
        try {
            const output = execSync(`du -sh ${dirPath}`, { encoding: 'utf8' });
            return output.trim().split('\t')[0];
        } catch (error) {
            return '0B';
        }
    }
    
    static checkStorageHealth() {
        const usage = this.getDiskUsage();
        if (!usage) return 'unknown';
        
        if (usage.percentage > 90) {
            console.log(`🚨 CRITICAL: Disk usage at ${usage.percentage}%`);
            return 'critical';
        } else if (usage.percentage > 80) {
            console.log(`⚠️  WARNING: Disk usage at ${usage.percentage}%`);
            return 'high';
        }
        
        return 'normal';
    }
    
    static emergencyCleanup() {
        console.log('🚨 Running emergency cleanup...');
        try {
            execSync('rm -rf ./temp/*');
            execSync('find ./public/optimized -type f -mmin +10 -delete');
            console.log('✅ Emergency cleanup completed');
        } catch (error) {
            console.error('Emergency cleanup failed:', error.message);
        }
    }
}

// Storage status endpoint
app.get('/storage-status', (req, res) => {
    const usage = StorageMonitor.getDiskUsage();
    const tempSize = StorageMonitor.getDirectorySize('./temp');
    const optimizedSize = StorageMonitor.getDirectorySize('./public/optimized');
    
    res.json({
        disk: usage,
        directories: {
            temp: tempSize,
            optimized: optimizedSize
        },
        timestamp: new Date().toISOString()
    });
});

// Enhanced cleanup with storage monitoring
function smartCleanup() {
    const storageHealth = StorageMonitor.checkStorageHealth();
    
    if (storageHealth === 'critical') {
        StorageMonitor.emergencyCleanup();
    } else {
        cleanupFiles();
    }
}

// Run cleanup every 30 minutes
setInterval(smartCleanup, 30 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(smartCleanup, 5000);

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🧹 Automatic cleanup enabled (every 30 minutes)`);
    console.log(`Available routes:`);
    console.log(`  GET  / - Main page`);
    console.log(`  POST /process - Image processing`);
    console.log(`  GET  /health - Health check`);
    console.log(`  GET  /test - Server test`);
});
