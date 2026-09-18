const express = require('express');
const path = require('path');
const { Readable } = require('stream');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/download', async (req, res) => {
try {
const { url } = req.body;

    if (!url) {
        return res.status(400).json({
            error: 'A video URL is required.'
        });
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(url);
    } catch {
        return res.status(400).json({
            error: 'Invalid URL.'
        });
    }

    // Only allow HTTPS URLs.
    if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({
            error: 'Only HTTPS URLs are supported.'
        });
    }

    // Fetch the authorized direct media URL.
    const response = await fetch(parsedUrl);

    if (!response.ok) {
        return res.status(response.status).json({
            error: `The media server returned ${response.status}.`
        });
    }

    const contentType =
        response.headers.get('content-type') || 'application/octet-stream';

    const contentLength =
        response.headers.get('content-length');

    res.setHeader('Content-Type', contentType);

    if (contentLength) {
        res.setHeader('Content-Length', contentLength);
    }

    res.setHeader(
        'Content-Disposition',
        'attachment; filename="video.mp4"'
    );

    if (!response.body) {
        return res.status(500).json({
            error: 'The media source did not return a stream.'
        });
    }

    // Convert the Web ReadableStream into a Node.js stream.
    const stream = Readable.fromWeb(response.body);

    stream.on('error', (error) => {
        console.error('Streaming error:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Unable to download the video.'
            });
        } else {
            res.destroy(error);
        }
    });

    stream.pipe(res);

} catch (error) {
    console.error('Download error:', error);

    if (!res.headersSent) {
        res.status(500).json({
            error: 'Unable to download the video.'
        });
    }
}


});

// Catch-all route for the frontend.
app.get('*', (req, res) => {
res.sendFile(
path.join(__dirname, 'public', 'index.html')
);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(
Downloader application running on port ${PORT}
);
});
