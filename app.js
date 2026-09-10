const express = require('express');
const path = require('path');
const { Innertube } = require('youtubei.js'); // The modern YouTube engine
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Reuse a single Innertube instance across requests for speed performance
let youtubeEngine = null;
async function getYoutubeInstance() {
  if (!youtubeEngine) {
    youtubeEngine = await Innertube.create();
  }
  return youtubeEngine;
}

// Low-memory streaming API endpoint
app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Missing video URL parameter.');
    }

    // Isolate the clean video ID
    const videoIdMatch = videoUrl.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    if (!videoIdMatch || videoIdMatch.length < 2 || videoIdMatch[1].length !== 11) {
      return res.status(400).send('Invalid YouTube URL format.');
    }
    const videoId = videoIdMatch[1];

    const youtube = await getYoutubeInstance();
    
    // Set headers to force download natively instead of buffering in memory
    res.setHeader('Content-Disposition', `attachment; filename="video_${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    // Request stream via Android endpoint to avoid 403 blocks
    const stream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'best',
      client: 'ANDROID'
    });

    // CRUCIAL: Immediately flash chunks to the browser to prevent RAM spikes
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    console.error('Download stream error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: Direct video data stream failed.');
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`youtubei.js engine running safely on port ${PORT}`);
});
