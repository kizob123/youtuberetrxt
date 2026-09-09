const express = require('express');
const path = require('path');
const { Innertube } = require('youtubei.js');
const app = express();

let youtube;

// Serve public directory for frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

function extractVideoId(url) {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

// NEW: Endpoint to fetch metadata for the live UI card preview
app.get('/meta', async (req, res) => {
  const videoURL = req.query.url;
  const videoId = extractVideoId(videoURL || '');
  
  if (!videoId || !youtube) {
    return res.status(400).json({ error: 'Invalid URL or server initializing' });
  }

  try {
    const videoInfo = await youtube.getInfo(videoId);
    res.json({
      title: videoInfo.basic_info.title,
      thumbnail: videoInfo.basic_info.thumbnail[0]?.url || 'https://placeholder.com',
      duration: videoInfo.basic_info.duration
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch video details' });
  }
});

// Download stream endpoint
app.get('/download', async (req, res) => {
  const videoURL = req.query.url;

  if (!videoURL || !youtube) {
    return res.status(400).send('Invalid request state');
  }

  const videoId = extractVideoId(videoURL);
  if (!videoId) return res.status(400).send('Invalid YouTube URL');

  try {
    const videoInfo = await youtube.getInfo(videoId);
    const title = videoInfo.basic_info.title.replace(/[^\w\s]/gi, '');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);

    const stream = await youtube.download(videoId, {
      type: 'video+audio',
      quality: 'bestefficiency',
      client: 'ANDROID'
    });

    const reader = stream.getReader();
    async function push() {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      push();
    }
    push();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.status(500).send('Download failed');
  }
});

// STARTUP WRAPPER: Force the server to wait until YouTube is ready
async function startServer() {
  try {
    console.log('Connecting to YouTube client...');
    youtube = await Innertube.create();
    console.log('YouTube client initialized successfully!');

    // FIX: Fallback to 3000 locally, but use Render's dynamic port allocation in production
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Youtuber Extraxt running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1); 
  }
}

startServer();
