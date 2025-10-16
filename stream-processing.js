// Enhanced stream processing approach
// This processes images directly in memory without saving to disk temporarily

const processImageStream = async (buffer, quality) => {
    try {
        // Get original image metadata
        const metadata = await sharp(buffer).metadata();
        
        // Calculate new dimensions (height divided by 1.5)
        const newHeight = Math.round(metadata.height / 1.5);
        const newWidth = Math.round((metadata.width * newHeight) / metadata.height);
        
        // Process image directly in memory
        const processedBuffer = await sharp(buffer)
            .resize(newWidth, newHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ 
                quality: quality,
                effort: 4 // Good balance of compression and speed
            })
            .toBuffer();
            
        return processedBuffer;
    } catch (error) {
        throw new Error(`Image processing failed: ${error.message}`);
    }
};

// Updated route for stream processing
app.post('/process-stream', upload.array('images', 10), async (req, res) => {
    try {
        const quality = parseInt(req.body.quality) || 80;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).send('<h1>Error: Please provide images.</h1><a href="/">Go back</a>');
        }
        
        // For single image - return directly
        if (files.length === 1) {
            const processedBuffer = await processImageStream(files[0].buffer, quality);
            
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Content-Disposition', `attachment; filename="${files[0].originalname.split('.')[0]}_optimized.webp"`);
            return res.send(processedBuffer);
        }
        
        // For multiple images - create ZIP in memory
        const archive = archiver('zip', { level: 1 }); // Minimal compression for ZIP
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="optimized_images.zip"');
        
        archive.pipe(res);
        
        // Process each image and add to ZIP
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const processedBuffer = await processImageStream(file.buffer, quality);
                const filename = `${file.originalname.split('.')[0]}_optimized.webp`;
                archive.append(processedBuffer, { name: filename });
            } catch (error) {
                console.error(`Error processing ${file.originalname}:`, error.message);
                // Add error note to ZIP instead of failing completely
                archive.append(`Error processing ${file.originalname}: ${error.message}`, 
                    { name: `ERROR_${file.originalname}.txt` });
            }
        }
        
        archive.finalize();
        
    } catch (error) {
        console.error('Stream processing error:', error);
        res.status(500).send('<h1>Error processing images</h1><a href="/">Go back</a>');
    }
});

module.exports = { processImageStream };