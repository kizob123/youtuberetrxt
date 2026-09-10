const express = require('express');
const path = require('path');
const { Innertube } = require('youtubei.js'); // The modern un-blockable media engine
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Reuse a single Innertube instance across requests for peak speed performance
let youtubeEngine = null;
async function getYoutubeInstance() {
  if (!youtubeEngine) {
    youtubeEngine = await Innertube.create();
  }
  return youtubeEngine;
}

// Secure backend download API tunnel
app.get('/api/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('Missing video URL parameter.');
    }

    // Resolve the incoming URL stream parameters securely
    const videoIdMatch = videoUrl.match(/^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/);
    if (!videoIdMatch || videoIdMatch[1].length !== 11) {
      return res.status(400).send('Invalid YouTube URL format.');
    }
    const videoId = videoIdMatch[1];

    // Fetch the client handshake instance
    const youtube = await getYoutubeInstance();
    
    // Set browser headers to force a secure download dialog natively
    res.header('Content-Disposition', `attachment; filename="youtuber_extract_${videoId}.mp4"`);
    
    // Fetch and stream the highest available resolution combine channel directly
    const stream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'best',
      client: 'ANDROID' // Mimics stable android requests to prevent 403 blocks
    });

    // Pipe the raw chunk stream array into the client web response frame
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    console.error('Modern download extraction failed:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error: Direct data stream execution failed.');
    }
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bulletproof core engine running safely on port ${PORT}`);
});
