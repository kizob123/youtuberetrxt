const express = require('express');
const path = require('path');
const ytdl = require('@distube/ytdl-core'); // Robust, updated downloader library
const app = express();

// Serve the frontend files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Secure backend API endpoint that processes the file stream
app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Missing video URL parameter.');
    }

    // Validate the link and check video details securely
    const isValid = ytdl.validateURL(videoUrl);
    if (!isValid) {
      return res.status(400).send('Invalid YouTube URL format.');
    }

    // Set browser headers to force a file download dialog natively
    res.header('Content-Disposition', 'attachment; filename="video.mp4"');
    
    // Stream the raw video data directly to the client browser block
    ytdl(videoUrl, {
      format: 'mp4',
      quality: 'highestvideo',
      filter: 'audioandvideo'
    }).pipe(res);

  } catch (error) {
    console.error('Download execution failure:', error);
    res.status(500).send('Internal Server Error: Failed to process video download stream.');
  }
});

// Catch-all route to serve index.html for the UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dynamic port configuration for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Youtuber Extraxt running on port ${PORT}`);
});
