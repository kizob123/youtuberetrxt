const express = require('express');
const path = require('path');
const { Innertube } = require('youtubei.js');
const app = express();

let youtube;

app.use(express.static(path.join(__dirname, 'public')));

function extractVideoId(url) {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match.length === 11) ? match : null;
}

// Meta & Download URL Signer combined
app.get('/meta', async (req, res) => {
  const videoURL = req.query.url;
  const videoId = extractVideoId(videoURL || '');
  
  if (!videoId || !youtube) {
    return res.status(400).json({ error: 'Invalid URL or server initializing' });
  }

  try {
    const videoInfo = await youtube.getInfo(videoId);
    
    // Get the direct streaming video URL using Android clients to bypass restrictions
    const format = videoInfo.chooseFormat({
      type: 'video+audio',
      quality: 'bestefficiency',
    });

    const directStreamingUrl = format ? format.decrypted_url : null;

    res.json({
      title: videoInfo.basic_info.title,
      thumbnail: videoInfo.basic_info.thumbnail?.url || 'https://placeholder.com',
      downloadUrl: directStreamingUrl // Passing direct URL to bypass server proxy limits
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'YouTube blocked this cloud server instance.' });
  }
});

async function startServer() {
  try {
    console.log('Connecting to YouTube...');
    // Initializing with desktop and mobile configuration strings to maximize uptime
    youtube = await Innertube.create({ retrieve_player: true });
    console.log('YouTube client initialized successfully!');

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
