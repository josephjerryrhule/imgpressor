const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger setup
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Add file logging in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
}

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || false] 
        : true,
    credentials: true
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Specific rate limiting for image processing
const processLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 image processing requests per windowMs
    message: 'Too many image processing requests, please try again later.'
});

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Create optimized directory if it doesn't exist
const optimizedDir = path.join(__dirname, 'public', 'optimized');
if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
}

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

// Body parser limits
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Middleware
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Helper function to download image
async function downloadImage(url) {
    try {
        logger.info(`Downloading image from URL: ${url}`);
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // Increased timeout for larger files
            maxContentLength: 100 * 1024 * 1024, // 100MB limit
            headers: {
                'User-Agent': 'Image-Compressor-App/1.0'
            }
        });

        // Check if response is an image
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('The provided URL does not point to a valid image.');
        }

        logger.info(`Successfully downloaded image: ${(response.data.length / 1024 / 1024).toFixed(2)}MB`);
        return Buffer.from(response.data);
    } catch (error) {
        logger.error(`Download failed for URL ${url}:`, error);
        if (error.response) {
            throw new Error(`Failed to download image: ${error.response.status} ${error.response.statusText}`);
        } else if (error.code === 'ENOTFOUND') {
            throw new Error('Invalid URL or unable to reach the server.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Download timeout. The image is too large or the connection is slow.');
        } else {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
}

// Helper function to optimize image
async function optimizeImage(buffer, quality = 80) {
    try {
        logger.info(`Optimizing image: ${(buffer.length / 1024 / 1024).toFixed(2)}MB, quality: ${quality}`);
        
        // Get metadata
        const metadata = await sharp(buffer).metadata();
        logger.info(`Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
        
        // Calculate new height (original / 1.5)
        const newHeight = Math.round(metadata.height / 1.5);
        
        // Resize and convert to WebP
        const optimizedBuffer = await sharp(buffer)
            .resize({ height: newHeight, withoutEnlargement: true })
            .webp({ quality: parseInt(quality) })
            .toBuffer();
        
        logger.info(`Image optimized: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        return optimizedBuffer;
    } catch (error) {
        logger.error('Image optimization failed:', error);
        throw new Error(`Image optimization failed: ${error.message}`);
    }
}

// Helper function to save buffer
function saveBuffer(buffer, prefix = 'optimized', ext = 'webp') {
    const filename = `${prefix}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(__dirname, 'public', 'optimized', filename);
    
    try {
        fs.writeFileSync(filepath, buffer);
        logger.info(`File saved: ${filename} (${(buffer.length / 1024).toFixed(2)}KB)`);
        return filename;
    } catch (error) {
        logger.error(`Failed to save file: ${filename}`, error);
        throw new Error(`Failed to save file: ${error.message}`);
    }
}// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

app.post('/process', processLimiter, upload.array('images', 10), async (req, res) => {
    const startTime = Date.now();
    try {
        const quality = req.body.quality || 80;
        let results = [];
        
        logger.info(`Processing request - Quality: ${quality}, Files: ${req.files ? req.files.length : 0}, URL: ${req.body.url ? 'provided' : 'none'}`);
        
        if (req.files && req.files.length > 0) {
            // Process uploaded files
            for (const file of req.files) {
                logger.info(`Processing uploaded file: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`);
                const result = await processImage(file.buffer, file.originalname, quality);
                results.push(result);
            }
        } else if (req.body.url) {
            // Process URL
            const originalBuffer = await downloadImage(req.body.url);
            const result = await processImage(originalBuffer, 'url_image.jpg', quality, req.body.url);
            results.push(result);
        } else {
            logger.warn('No images or URL provided in request');
            return res.status(400).send('<h1>Error: Please provide images or a URL.</h1><a href="/">Go back</a>');
        }
        
        const processingTime = Date.now() - startTime;
        logger.info(`Processing completed in ${processingTime}ms for ${results.length} images`);
        
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
                <a href="/optimized/${result.optimizedFilename}" download class="mt-2 inline-block bg-green-500 text-white text-sm py-1 px-3 rounded hover:bg-green-600 transition duration-200">
                    Download
                </a>
            </div>
        `).join('');
        
        const totalSaved = results.reduce((sum, r) => sum + r.savedBytes, 0);
        const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
        const totalPercentage = ((totalSaved / totalOriginal) * 100).toFixed(2);
        
        const resultHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Compression Results</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 min-h-screen py-8">
                <div class="max-w-6xl mx-auto px-4">
                    <h1 class="text-3xl font-bold text-center mb-8 text-gray-800">Images Compressed Successfully!</h1>
                    
                    <div class="bg-white p-6 rounded-lg shadow-md text-center mb-8">
                        <h2 class="text-2xl font-semibold mb-4 text-gray-800">Total Results</h2>
                        <p class="text-lg"><strong>Total Space Saved:</strong> ${(totalSaved / 1024).toFixed(2)} KB</p>
                        <p class="text-lg"><strong>Average Savings:</strong> ${totalPercentage}%</p>
                        <p class="text-sm text-gray-600 mt-2">Processing time: ${processingTime}ms</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        ${resultItems}
                    </div>
                    
                    <div class="text-center">
                        <a href="/" class="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600 transition duration-200 inline-block">
                            Compress More Images
                        </a>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        res.send(resultHtml);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error(`Processing failed after ${processingTime}ms:`, error);
        res.status(500).send(`<h1>Error: ${error.message}</h1><a href="/">Go back</a>`);
    }
});

// Helper function to process a single image
async function processImage(buffer, filename, quality, url = null) {
    const originalSize = buffer.length;
    
    try {
        // Optimize image
        const optimizedBuffer = await optimizeImage(buffer, quality);
        const optimizedSize = optimizedBuffer.length;
        
        // Save optimized image
        const optimizedFilename = saveBuffer(optimizedBuffer, 'optimized', 'webp');
        
        // Save original for preview if from upload
        let originalPreview;
        if (url) {
            originalPreview = url;
        } else {
            const ext = path.extname(filename) || '.jpg';
            const originalFilename = saveBuffer(buffer, 'original', ext.slice(1));
            originalPreview = `/optimized/${originalFilename}`;
        }
        
        // Calculate savings
        const savedBytes = originalSize - optimizedSize;
        const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(2);
        
        logger.info(`Image processed: ${filename} - Original: ${(originalSize/1024).toFixed(2)}KB, Optimized: ${(optimizedSize/1024).toFixed(2)}KB, Saved: ${savedPercentage}%`);
        
        return {
            name: filename,
            originalPreview,
            optimizedFilename,
            originalSize,
            optimizedSize,
            savedBytes,
            savedPercentage
        };
    } catch (error) {
        logger.error(`Failed to process image ${filename}:`, error);
        throw error;
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('<h1>Error: File too large. Maximum size is 100MB per file.</h1><a href="/">Go back</a>');
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).send('<h1>Error: Too many files. Maximum is 10 files at once.</h1><a href="/">Go back</a>');
        }
    }
    
    res.status(500).send('<h1>Internal Server Error</h1><a href="/">Go back</a>');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running at http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'}`);
});
